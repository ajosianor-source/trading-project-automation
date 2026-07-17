"""Authenticated loopback-only Telegram relay. Disabled unless fully configured."""

import hmac
import json
import urllib.request
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

PORT = 8787
MAX_BODY_BYTES = 4096
ROOT = Path(__file__).resolve().parent
LOG_FILE = ROOT.parent.parent / "runtime" / "relay.log"
CONFIG_FILE = ROOT / "config.json"


def load_config() -> dict:
    try:
        config = json.loads(CONFIG_FILE.read_text(encoding="utf-8"))
    except (OSError, ValueError, TypeError) as exc:
        raise SystemExit("Relay disabled: valid local config.json is required") from exc
    token = str(config.get("relay_token", ""))
    if len(token) < 32:
        raise SystemExit("Relay disabled: relay_token must contain at least 32 characters")
    if not config.get("telegram_bot_token") or not config.get("telegram_chat_id"):
        raise SystemExit("Relay disabled: Telegram credentials are incomplete")
    return config


CONFIG = load_config()
RELAY_TOKEN = str(CONFIG["relay_token"])
TELEGRAM_TOKEN = str(CONFIG["telegram_bot_token"])
TELEGRAM_CHAT_ID = str(CONFIG["telegram_chat_id"])


def log(message: str):
    safe = message.replace("\r", " ").replace("\n", " ")[:500]
    line = f"{datetime.now(timezone.utc).isoformat()} {safe}"
    LOG_FILE.parent.mkdir(parents=True, exist_ok=True)
    with LOG_FILE.open("a", encoding="utf-8") as stream:
        stream.write(line + "\n")


def send_telegram(message: str) -> bool:
    url = f"https://api.telegram.org/bot{TELEGRAM_TOKEN}/sendMessage"
    data = json.dumps({"chat_id": TELEGRAM_CHAT_ID, "text": message}).encode("utf-8")
    request = urllib.request.Request(
        url, data=data, headers={"Content-Type": "application/json"}, method="POST"
    )
    try:
        with urllib.request.urlopen(request, timeout=8) as response:
            result = json.loads(response.read(64_000))
        return bool(result.get("ok"))
    except (OSError, ValueError, TypeError):
        return False


class RelayHandler(BaseHTTPRequestHandler):
    server_version = "ExnessLocalRelay/1.0"
    sys_version = ""

    def _authorized(self) -> bool:
        if self.client_address[0] not in {"127.0.0.1", "::1"}:
            return False
        supplied = self.headers.get("Authorization", "")
        expected = f"Bearer {RELAY_TOKEN}"
        return hmac.compare_digest(supplied, expected)

    def _respond(self, code: int, payload: dict):
        body = json.dumps(payload, separators=(",", ":")).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("X-Frame-Options", "DENY")
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path != "/health":
            self._respond(404, {"error": "not found"})
        elif not self._authorized():
            self._respond(401, {"error": "unauthorized"})
        else:
            self._respond(200, {"status": "ok"})

    def do_POST(self):
        if self.path != "/alert":
            self._respond(404, {"error": "not found"})
            return
        if not self._authorized():
            self._respond(401, {"error": "unauthorized"})
            return
        if self.headers.get_content_type() != "text/plain":
            self._respond(415, {"error": "text/plain required"})
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            length = -1
        if length < 1 or length > MAX_BODY_BYTES:
            self._respond(413, {"error": "invalid message size"})
            return
        try:
            message = self.rfile.read(length).decode("utf-8", errors="strict").strip()
        except UnicodeDecodeError:
            self._respond(400, {"error": "invalid UTF-8"})
            return
        if not message:
            self._respond(400, {"error": "empty message"})
            return
        success = send_telegram(message[:1500])
        log("alert delivered" if success else "alert delivery failed")
        self._respond(200 if success else 502, {"status": "sent" if success else "failed"})

    def log_message(self, format, *args):
        pass


if __name__ == "__main__":
    server = ThreadingHTTPServer(("127.0.0.1", PORT), RelayHandler)
    server.daemon_threads = True
    log("authenticated loopback relay started")
    try:
        server.serve_forever(poll_interval=0.5)
    except KeyboardInterrupt:
        server.server_close()
