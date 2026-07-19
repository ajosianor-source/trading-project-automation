"""Loopback-only, read-only dashboard server for ExnessGoldGuard."""

import http.server
import json
import os
import sys
from pathlib import Path
from urllib.parse import urlsplit

PORT = 3030
MAX_FEED_BYTES = 2_000_000
MAX_HISTORY_BYTES = 5_000_000
PROJECT_ROOT = Path(__file__).resolve().parent.parent
DASHBOARD_DIR = (PROJECT_ROOT / "dashboard").resolve()
RUNTIME_DIR = (PROJECT_ROOT / "runtime").resolve()
COMMON_FEED_DIR = (
    Path(os.environ.get("APPDATA", ""))
    / "MetaQuotes" / "Terminal" / "Common" / "Files" / "ExnessGoldGuard"
).resolve()
LIVE_FEED_CANDIDATES = (
    COMMON_FEED_DIR / "live.json",
    COMMON_FEED_DIR / "btc-live.json",
    RUNTIME_DIR / "live.json",
    RUNTIME_DIR / "btc-live.json",
)
ALLOWED_ASSETS = {"/", "/index.html", "/app.js", "/styles.css", "/favicon.ico"}
ALLOWED_HOSTS = {f"localhost:{PORT}", f"127.0.0.1:{PORT}", f"[::1]:{PORT}"}

sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_signal_history import build_history  # noqa: E402


def resolve_live_feed() -> Path:
    existing = [path for path in LIVE_FEED_CANDIDATES if path.is_file()]
    if not existing:
        raise FileNotFoundError("MT5 dashboard feed is unavailable")
    selected = max(existing, key=lambda path: path.stat().st_mtime)
    resolved = selected.resolve(strict=True)
    allowed_parents = {COMMON_FEED_DIR, RUNTIME_DIR}
    if resolved.parent not in allowed_parents or resolved.suffix.lower() != ".json":
        raise PermissionError("Dashboard feed path was rejected")
    if resolved.stat().st_size > MAX_FEED_BYTES:
        raise ValueError("Dashboard feed exceeds the size limit")
    return resolved


class DashboardHandler(http.server.SimpleHTTPRequestHandler):
    server_version = "ExnessGuardLocal/1.0"
    sys_version = ""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(DASHBOARD_DIR), **kwargs)

    def _request_allowed(self) -> bool:
        host = self.headers.get("Host", "").lower()
        if host not in ALLOWED_HOSTS:
            self.send_error(403, "Local dashboard access only")
            return False
        origin = self.headers.get("Origin")
        if origin and origin.lower() not in {
            f"http://localhost:{PORT}", f"http://127.0.0.1:{PORT}"
        }:
            self.send_error(403, "Cross-origin access denied")
            return False
        return self.client_address[0] in {"127.0.0.1", "::1"}

    def end_headers(self):
        # Dashboard assets and the HTML shell must update as one version. A
        # cached stylesheet paired with newer HTML can collapse the CSS grid.
        self.send_header("Cache-Control", "no-store, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("X-Frame-Options", "DENY")
        self.send_header("Referrer-Policy", "no-referrer")
        self.send_header("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
        self.send_header(
            "Content-Security-Policy",
            "default-src 'self'; script-src 'self'; style-src 'self'; "
            "img-src 'self' data:; connect-src 'self'; object-src 'none'; "
            "base-uri 'none'; frame-ancestors 'none'; form-action 'none'",
        )
        super().end_headers()

    def _json_response(self, status: int, payload: dict, max_bytes: int):
        data = json.dumps(payload, separators=(",", ":")).encode("utf-8")
        if len(data) > max_bytes:
            raise ValueError("Response exceeds the size limit")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(data)

    def do_GET(self):
        if not self._request_allowed():
            return
        path = urlsplit(self.path).path
        try:
            if path == "/live.json":
                feed_path = resolve_live_feed()
                payload = json.loads(feed_path.read_text(encoding="utf-8"))
                if not isinstance(payload, dict) or payload.get("schema") not in (1, 2, 3):
                    raise ValueError("Invalid dashboard schema")
                payload["eaHeartbeat"] = payload.get("heartbeat")
                payload["heartbeat"] = int(feed_path.stat().st_mtime)
                self._json_response(200, payload, MAX_FEED_BYTES)
                return
            if path == "/signals-history.json":
                self._json_response(200, build_history(), MAX_HISTORY_BYTES)
                return
            if path not in ALLOWED_ASSETS:
                self.send_error(404, "Not found")
                return
            self.path = path
            super().do_GET()
        except (OSError, ValueError, TypeError, json.JSONDecodeError):
            self._json_response(503, {"error": "Dashboard data unavailable"}, 1024)

    def do_HEAD(self):
        self.do_GET()

    def do_POST(self):
        self.send_error(405, "Read-only service")

    do_PUT = do_POST
    do_DELETE = do_POST
    do_PATCH = do_POST
    do_OPTIONS = do_POST
    do_TRACE = do_POST

    def log_message(self, format, *args):
        pass


class SecureThreadingServer(http.server.ThreadingHTTPServer):
    allow_reuse_address = True
    daemon_threads = True
    request_queue_size = 16


if __name__ == "__main__":
    with SecureThreadingServer(("127.0.0.1", PORT), DashboardHandler) as server:
        print(f"Dashboard: http://localhost:{PORT}", flush=True)
        print("Security: loopback-only, same-origin, read-only", flush=True)
        try:
            server.serve_forever(poll_interval=0.5)
        except KeyboardInterrupt:
            print("Dashboard server stopped.")
