"""
ExnessGoldGuard Local Dashboard Server
Serves the dashboard at http://localhost:3030
and proxies live.json directly so no file-picker permission is needed on refresh.
"""

import http.server
import json
import os
import socketserver
import sys
from pathlib import Path

PORT = 3030
DASHBOARD_DIR = Path(__file__).parent.parent / "dashboard"
LIVE_JSON = Path(__file__).parent.parent / "runtime" / "live.json"
HISTORY_JSON = Path(__file__).parent.parent / "runtime" / "signals-history.json"

# Import history builder
sys.path.insert(0, str(Path(__file__).parent))
from build_signal_history import build_history


class DashboardHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(DASHBOARD_DIR), **kwargs)

    def do_GET(self):
        # Serve live.json directly from runtime folder — no file picker needed
        if self.path == "/live.json":
            try:
                data = LIVE_JSON.read_bytes()
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.send_header("Content-Length", str(len(data)))
                self.send_header("Cache-Control", "no-cache")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                self.wfile.write(data)
            except Exception as e:
                self.send_response(503)
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode())
            return

        # Serve signals-history.json — rebuilt fresh on every request
        if self.path == "/signals-history.json":
            try:
                history = build_history()
                data = json.dumps(history).encode("utf-8")
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.send_header("Content-Length", str(len(data)))
                self.send_header("Cache-Control", "no-cache")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                self.wfile.write(data)
            except Exception as e:
                self.send_response(503)
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode())
            return

        super().do_GET()

    def log_message(self, format, *args):
        pass  # suppress access log noise


if __name__ == "__main__":
    with socketserver.TCPServer(("127.0.0.1", PORT), DashboardHandler) as server:
        server.allow_reuse_address = True
        print(f"Dashboard: http://localhost:{PORT}", flush=True)
        print(f"Live feed: http://localhost:{PORT}/live.json", flush=True)
        print("Press Ctrl+C to stop.", flush=True)
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            print("Dashboard server stopped.")
