# Dashboard access

Open the dashboard through the local server for refresh-stable live updates:

1. Run `Start-ExnessGuard-Stack.cmd` (recommended), or start
   `tools/dashboard_server.py` manually.
2. Open `http://localhost:3030` in Microsoft Edge or Google Chrome.

The stack launcher specifically checks `C:\mt5exness\terminal64.exe`; this
prevents another installed MT5 terminal from being mistaken for Exness.

The server is intentionally available only from the same machine at
`localhost:3030`. Do not expose it through a tunnel, reverse proxy, firewall
rule, router port-forward, or public web server because its feed contains
private account telemetry.

To connect the running EA:

1. Attach Exness Guard v1.40 to the Exness XAUUSD or BTCUSD H1 chart and load
   the matching preset.
2. Wait for the MT5 Experts log to print the dashboard feed path.
3. Use **Connect MT5 live file** only if you are opening the HTML file directly
   or the local server cannot reach the runtime feed.
4. Select `live.json` for gold or `btc-live.json` for bitcoin under
   `%APPDATA%\MetaQuotes\Terminal\Common\Files\ExnessGoldGuard`.

The page only reads the JSON feed. It contains no order controls. The local
server proxies the newest EA feed from MT5's Common Files directory (with the
project `runtime` directory as a fallback), so refreshes do not require a new
file permission prompt.
