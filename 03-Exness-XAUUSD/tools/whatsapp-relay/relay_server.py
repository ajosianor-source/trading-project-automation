"""
ExnessGoldGuard WhatsApp Relay Server
Listens on http://127.0.0.1:8787
- GET  /health  -> returns {"status":"ok"}
- POST /alert   -> sends text body as WhatsApp message via wa.me deep link + toast
"""

import json
import subprocess
import sys
import webbrowser
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path
from urllib.parse import quote

PORT = 8787
LOG_FILE = r"C:\Users\nexfe\Desktop\Trading\03-Exness-XAUUSD\runtime\relay.log"

# Load phone number from local config (not committed to git)
_cfg_path = Path(__file__).parent / "config.json"
try:
    WHATSAPP_NUMBER = json.loads(_cfg_path.read_text()).get("whatsapp_number", "")
except Exception:
    WHATSAPP_NUMBER = ""  # copy config.example.json to config.json and fill in your number


def log(msg):
    from datetime import datetime
    line = f"{datetime.now().strftime('%Y-%m-%d %H:%M:%S')} {msg}"
    print(line, flush=True)
    try:
        with open(LOG_FILE, "a", encoding="utf-8") as f:
            f.write(line + "\n")
    except Exception:
        pass


def send_whatsapp(message: str) -> bool:
    """
    Send via WhatsApp desktop using wa.me deep link.
    Falls back to Windows toast notification if number not configured.
    """
    if WHATSAPP_NUMBER:
        url = f"whatsapp://send?phone={WHATSAPP_NUMBER}&text={quote(message)}"
        try:
            subprocess.Popen(
                ["cmd", "/c", "start", "", url],
                shell=False,
                creationflags=subprocess.CREATE_NO_WINDOW
            )
            log(f"SENT via WhatsApp to {WHATSAPP_NUMBER}: {message[:80]}")
            return True
        except Exception as e:
            log(f"ERROR WhatsApp deep link failed: {e}")

    # Fallback: Windows toast notification
    try:
        ps_script = f"""
        [Windows.UI.Notifications.ToastNotificationManager,Windows.UI.Notifications,ContentType=WindowsRuntime] | Out-Null
        [Windows.Data.Xml.Dom.XmlDocument,Windows.Data.Xml.Dom,ContentType=WindowsRuntime] | Out-Null
        $template = '<toast><visual><binding template="ToastText02"><text id="1">ExnessGoldGuard Alert</text><text id="2">{message[:200].replace('"', "'")}</text></binding></visual></toast>'
        $xml = New-Object Windows.Data.Xml.Dom.XmlDocument
        $xml.LoadXml($template)
        $toast = [Windows.UI.Notifications.ToastNotification]::new($xml)
        [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier("ExnessGoldGuard").Show($toast)
        """
        subprocess.Popen(
            [r"C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe", "-NoProfile", "-WindowStyle", "Hidden", "-Command", ps_script],
            creationflags=subprocess.CREATE_NO_WINDOW
        )
        log(f"SENT via Windows toast: {message[:80]}")
        return True
    except Exception as e:
        log(f"ERROR toast failed: {e}")
        return False


class RelayHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        pass  # suppress default access log

    def do_GET(self):
        if self.path == "/health":
            self._respond(200, {"status": "ok", "port": PORT})
        else:
            self._respond(404, {"error": "not found"})

    def do_POST(self):
        if self.path == "/alert":
            length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(length).decode("utf-8", errors="replace").strip()
            log(f"ALERT received: {body[:120]}")
            success = send_whatsapp(body)
            if success:
                self._respond(200, {"status": "sent"})
            else:
                self._respond(500, {"status": "error", "detail": "delivery failed"})
        else:
            self._respond(404, {"error": "not found"})

    def _respond(self, code, data):
        body = json.dumps(data).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


if __name__ == "__main__":
    if not WHATSAPP_NUMBER:
        log("WARNING: WHATSAPP_NUMBER not set — alerts will use Windows toast notifications only.")
        log("         Edit relay_server.py and set WHATSAPP_NUMBER to your number (e.g. '601234567890')")

    server = HTTPServer(("127.0.0.1", PORT), RelayHandler)
    log(f"ExnessGoldGuard WhatsApp Relay started on http://127.0.0.1:{PORT}")
    log("Endpoints: GET /health  |  POST /alert")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        log("Relay server stopped.")
        server.server_close()
