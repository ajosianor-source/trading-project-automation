#!/usr/bin/env python3
"""Localhost-only SignalForge to Twilio WhatsApp/SMS relay."""

from __future__ import annotations

import argparse
import base64
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


ROOT = Path(__file__).resolve().parent
ENV_FILE = ROOT / ".env"
MAX_BODY_BYTES = 4096


def load_env(path: Path) -> None:
    if not path.exists():
        return
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip("\"'")
        os.environ.setdefault(key, value)


def normalize_whatsapp_number(value: str) -> str:
    value = value.strip()
    if value.startswith("whatsapp:"):
        return value
    return f"whatsapp:{value}"


def normalize_phone_number(value: str) -> str:
    return value.strip().removeprefix("sms:")


class Configuration:
    def __init__(self) -> None:
        load_env(ENV_FILE)
        self.account_sid = os.getenv("TWILIO_ACCOUNT_SID", "").strip()
        self.auth_token = os.getenv("TWILIO_AUTH_TOKEN", "").strip()
        self.whatsapp_from = normalize_whatsapp_number(
            os.getenv("TWILIO_WHATSAPP_FROM", "+14155238886")
        )
        self.whatsapp_to = normalize_whatsapp_number(
            os.getenv("TWILIO_WHATSAPP_TO", "")
        )
        self.sms_from = normalize_phone_number(os.getenv("TWILIO_SMS_FROM", ""))
        self.sms_to = normalize_phone_number(os.getenv("TWILIO_SMS_TO", ""))
        configured_channels = os.getenv("TWILIO_ALERT_CHANNELS", "").strip()
        if configured_channels:
            self.channels = [
                channel.strip().lower()
                for channel in configured_channels.split(",")
                if channel.strip()
            ]
        else:
            self.channels = ["whatsapp"]
            if self.sms_from and self.sms_to:
                self.channels.append("sms")

    @property
    def missing(self) -> list[str]:
        values = {
            "TWILIO_ACCOUNT_SID": self.account_sid,
            "TWILIO_AUTH_TOKEN": self.auth_token,
        }
        if "whatsapp" in self.channels:
            values["TWILIO_WHATSAPP_TO"] = self.whatsapp_to.removeprefix("whatsapp:")
        if "sms" in self.channels:
            values["TWILIO_SMS_FROM"] = self.sms_from
            values["TWILIO_SMS_TO"] = self.sms_to
        return [name for name, value in values.items() if not value]


CONFIG = Configuration()


def send_twilio_message(channel: str, message: str) -> dict:
    if CONFIG.missing:
        raise RuntimeError("Missing configuration: " + ", ".join(CONFIG.missing))

    if channel == "whatsapp":
        sender = CONFIG.whatsapp_from
        recipient = CONFIG.whatsapp_to
        user_agent = "SignalForge-WhatsApp-Relay/1.1"
    elif channel == "sms":
        sender = CONFIG.sms_from
        recipient = CONFIG.sms_to
        user_agent = "SignalForge-SMS-Relay/1.1"
    else:
        raise RuntimeError(f"Unsupported alert channel: {channel}")

    endpoint = (
        "https://api.twilio.com/2010-04-01/Accounts/"
        f"{urllib.parse.quote(CONFIG.account_sid)}/Messages.json"
    )
    payload = urllib.parse.urlencode(
        {
            "From": sender,
            "To": recipient,
            "Body": message,
        }
    ).encode("utf-8")
    credentials = base64.b64encode(
        f"{CONFIG.account_sid}:{CONFIG.auth_token}".encode("utf-8")
    ).decode("ascii")
    request = urllib.request.Request(
        endpoint,
        data=payload,
        method="POST",
        headers={
            "Authorization": f"Basic {credentials}",
            "Content-Type": "application/x-www-form-urlencoded",
            "User-Agent": user_agent,
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=15) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as error:
        detail = error.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"Twilio HTTP {error.code}: {detail}") from error
    except urllib.error.URLError as error:
        raise RuntimeError(f"Twilio connection failed: {error.reason}") from error


def send_alert(message: str) -> dict:
    errors: list[str] = []
    for channel in CONFIG.channels:
        try:
            result = send_twilio_message(channel, message)
            result["_channel"] = channel
            result["_fallback_errors"] = errors
            return result
        except RuntimeError as error:
            errors.append(f"{channel}: {error}")
            continue
    raise RuntimeError("All alert channels failed: " + " | ".join(errors))


class RelayHandler(BaseHTTPRequestHandler):
    server_version = "SignalForgeRelay/1.0"

    def log_message(self, fmt: str, *args: object) -> None:
        timestamp = datetime.now().astimezone().isoformat(timespec="seconds")
        print(f"[{timestamp}] {self.address_string()} {fmt % args}", flush=True)

    def send_json(self, status: int, payload: dict) -> None:
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self) -> None:
        if self.path != "/health":
            self.send_json(404, {"ok": False, "error": "Not found"})
            return
        self.send_json(
            200,
            {
                "ok": True,
                "service": "SignalForge WhatsApp/SMS relay",
                "configured": not CONFIG.missing,
                "missing": CONFIG.missing,
                "channels": CONFIG.channels,
            },
        )

    def do_POST(self) -> None:
        if self.path != "/alert":
            self.send_json(404, {"ok": False, "error": "Not found"})
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            self.send_json(400, {"ok": False, "error": "Invalid Content-Length"})
            return
        if length < 1 or length > MAX_BODY_BYTES:
            self.send_json(413, {"ok": False, "error": "Invalid message size"})
            return

        message = self.rfile.read(length).decode("utf-8", errors="strict").strip()
        if not message:
            self.send_json(400, {"ok": False, "error": "Message is empty"})
            return
        try:
            result = send_alert(message[:1500])
            self.send_json(
                200,
                {
                    "ok": True,
                    "channel": result.get("_channel", ""),
                    "sid": result.get("sid", ""),
                    "status": result.get("status", "queued"),
                    "fallbackErrors": result.get("_fallback_errors", []),
                },
            )
        except (RuntimeError, UnicodeDecodeError) as error:
            self.log_error("%s", error)
            self.send_json(502, {"ok": False, "error": str(error)})


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", default=8787, type=int)
    parser.add_argument(
        "--check",
        action="store_true",
        help="Validate private configuration without starting the server.",
    )
    args = parser.parse_args()

    if args.check:
        if CONFIG.missing:
            print("Missing: " + ", ".join(CONFIG.missing))
            return 2
        print("WhatsApp relay configuration is ready.")
        return 0

    if CONFIG.missing:
        print(
            "Alert relay cannot start. Create .env from .env.example and fill: "
            + ", ".join(CONFIG.missing),
            file=sys.stderr,
        )
        return 2

    server = ThreadingHTTPServer((args.host, args.port), RelayHandler)
    print(
        f"SignalForge WhatsApp/SMS relay listening on http://{args.host}:{args.port}",
        flush=True,
    )
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
