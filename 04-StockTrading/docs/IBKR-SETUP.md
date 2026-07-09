# IBKR paper-data setup

StockForge uses the official TWS socket API. **IBKR Desktop is not the socket
API host.** Install Trader Workstation (recommended while developing) or IB
Gateway in addition to IBKR Desktop.

## Current safety state

- Environment accepted by code: `paper` only
- Local hosts accepted: `127.0.0.1` or `localhost` only
- Accepted paper ports: TWS `7497`, IB Gateway `4002`
- StockForge order methods: not implemented
- `orderRoutingEnabled`: `false`

## 1. Wait for account approval

The application may be approved without immediate funding, but IBKR states that
normal API market data requires an opened, funded IBKR Pro account. You can
install and configure the software now; expect market-data requests to remain
limited until the account is approved, funded, and subscribed.

## 2. Install the API host

Install one:

- Trader Workstation (TWS): best for development because data and positions can
  be checked visually
- IB Gateway: lighter resource use once the integration is established

Use IBKR's Stable/Offline build for API work so an automatic update is less
likely to get ahead of the API library.

## 3. Install the official TWS API package

Download the Windows TWS API installer only from IBKR's official API download
page. The normal installation creates:

```text
C:\TWS API\source\pythonclient
```

Then install that official source into StockForge's isolated environment:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass `
  -File .\tools\Install-IbkrPythonApi.ps1
```

Do not install an unofficial `ibapi` package from PyPI.

## 4. Configure TWS for paper diagnostics

After the live application is approved and a paper account is available:

1. Start TWS and select **Paper Trading** at login.
2. Open `File > Global Configuration > API > Settings`.
3. Enable **ActiveX and Socket Clients**.
4. Set socket port to `7497`.
5. Keep **Read-Only API** enabled for the current StockForge phase.
6. Allow only localhost connections.
7. Apply settings.

For IB Gateway, use paper port `4002`.

StockForge intentionally differs from IBKR's generic order-routing setup by
keeping Read-Only API enabled.

## 5. Run diagnostics

For TWS:

```powershell
.\START-IBKR-DIAGNOSTICS.cmd
```

For IB Gateway:

```powershell
.\START-IBKR-DIAGNOSTICS.cmd --port 4002
```

The check reads the server time, managed paper account ID, and account summary.
It cannot send an order.

## 6. Fetch daily research bars

Example:

```powershell
.\START-IBKR-MARKET-DATA.cmd `
  --symbols SPY AAPL MSFT NVDA AMZN GOOGL `
  --output data\ibkr-daily-bars.csv
```

The live configuration contains 50 stock symbols plus the SPY benchmark. Fetch
in measured batches and respect IBKR historical-data pacing.

To refresh the complete configured universe and rebuild the dashboard in one
step:

```powershell
.\REFRESH-IBKR-DASHBOARD.cmd
```

The resulting ranking uses dividend/split-adjusted IBKR price/volume,
technical, liquidity, volatility, and broad-market evidence. Fundamentals and
news sentiment display as `N/A` until separate verified providers are
configured; they are not silently given neutral scores.

## 7. Live-data prerequisites

After funding:

1. Confirm non-professional/professional market-data status accurately.
2. Subscribe to the appropriate Level 1 exchange feeds.
3. Complete the Market Data API acknowledgement.
4. Link the live user's market data to the paper username where available.
5. Verify quotes manually in TWS before relying on API output.

Market-data subscriptions belong to a username; paper credentials are distinct
from live credentials.
