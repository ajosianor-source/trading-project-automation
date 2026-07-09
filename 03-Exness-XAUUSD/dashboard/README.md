# Dashboard access

Open `index.html` in Microsoft Edge or Google Chrome.

To connect the running EA:

1. Attach Exness Guard v1.20 to the Exness XAUUSD or BTCUSD H1 chart and load
   the matching preset.
2. Wait for the MT5 Experts log to print `Dashboard feed: ...live.json`.
3. Click **Connect MT5 live file** in the dashboard.
4. Select `live.json` for gold or `btc-live.json` for bitcoin under
   `%APPDATA%\MetaQuotes\Terminal\Common\Files\ExnessGoldGuard`.

The page only reads the JSON feed. It contains no order controls.
