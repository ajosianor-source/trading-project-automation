# Bitcoin Guard Dashboard

This directory is reserved for the local monitoring dashboard files.

## How to use

1. The Expert Advisor exports its live state to `%APPDATA%\MetaQuotes\Terminal\Common\Files\ExnessBitcoinGuard\btc-live.json`.
2. You can use the existing dashboard server under `03-Exness-XAUUSD/tools/dashboard_server.py` or configure a local web server to read the `btc-live.json` file.
3. Open the dashboard in your browser to monitor:
   - EA Heartbeat & Connection Status
   - Account Balance, Equity, and Free Margin
   - 12-Factor Signal Alignment Progress
   - Active Positions & Floating P/L
   - Daily Risk & Drawdown Limits
