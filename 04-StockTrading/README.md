# StockForge — Project 04

StockForge is a transparent stock-ranking, risk-sizing, research, and guarded
paper-trading workspace. It does not promise a universally "best" stock.
Instead, it ranks a configured universe, rejects candidates that fail hard risk
gates, and exposes the evidence behind each result.

## What it evaluates

- Technical structure: 20/50/200-day trend, 3/6-month momentum, RSI, breakout
  proximity, and relative volume
- Fundamentals: return on equity, operating margin, revenue and earnings
  growth, leverage, forward P/E, and PEG
- Risk quality: liquidity, annualized volatility, drawdown, and ATR
- News sentiment from the selected data provider
- Broad-market regime using the configured benchmark
- Data freshness and minimum-history requirements
- ATR-based stop distance and account-level position sizing

The highest-ranked eligible symbol is a **review candidate**, not an automatic
buy instruction.

StockForge is long-only. Its directional output is either `PAPER BUY SETUP` or
`NO TRADE`; it never instructs the user to open a short sale. For an existing
long position, `SELL` means closing some or all shares at the protective stop,
the provisional 2R target, or an earlier manually reviewed invalidation.

## Quick start

Run a fully offline synthetic test:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\tools\Test-StockForge.ps1
```

Then open:

```text
dashboard\index.html
```

Synthetic results are prominently labelled and must not be treated as market
analysis.

## Live research data

1. Get an Alpha Vantage API key.
2. Copy `config\stocks.example.json` to `config\stocks.local.json`.
3. Set the key for the current PowerShell session:

```powershell
$env:ALPHAVANTAGE_API_KEY = "your-key"
```

4. Run:

```powershell
.\START-STOCK-SCANNER.cmd -ConfigPath .\config\stocks.local.json
```

The initial ten-stock scan makes multiple API calls and can take several
minutes on a free data plan. Responses are cached under `data\cache`.

## SEC filing dossier

Identify your application as required by SEC fair-access guidance:

```powershell
$env:SEC_USER_AGENT = "StockForge your-email@example.com"
.\tools\Get-SecDossier.ps1 -Symbol MSFT
```

This writes a machine-readable filing/fundamentals dossier under `reports`.
Always verify extracted XBRL values against the official filing document.

## Alpaca paper orders

Paper execution is intentionally locked by several independent gates:

- a local configuration file must use `mode: "paper"`
- the broker environment must be `paper`
- the endpoint must exactly equal `https://paper-api.alpaca.markets`
- `orderRoutingEnabled` must be manually changed to `true`
- order notional must remain below the configured maximum
- paper credentials must be supplied through environment variables
- the explicit confirmation phrase is required

Preview an order without sending it:

```powershell
.\tools\Submit-AlpacaPaperOrder.ps1 -Symbol MSFT -Side buy -Quantity 1 -LimitPrice 100
```

See `docs\OPERATIONS.md` before enabling paper routing. This project contains no
live-money order script.

## Python alpha and meta-label research

The isolated ML environment is under `ml/`:

```powershell
cd .\ml
uv sync
uv run pytest
```

It implements stationary feature engineering, chronological/embargoed
walk-forward training, a separate meta-labeler, hard inference gates, CVaR and
ATR controls, restricted model persistence, and research-only scoring. Read
`ml\README.md` and `docs\ML-PROMOTION.md` before training a candidate.

## IBKR integration

StockForge now has a read-only, paper-only IBKR TWS/Gateway adapter for account
diagnostics and historical daily bars. IBKR Desktop alone is not the required
API host. Follow `docs\IBKR-SETUP.md` to install TWS or IB Gateway and the
official TWS Python API.

The live configuration contains 50 liquid US stocks. The five-symbol dashboard
is synthetic demo data, not the live universe.

With TWS logged into Paper Trading and the read-only API enabled:

```powershell
.\REFRESH-IBKR-DASHBOARD.cmd
```

This retrieves the full IBKR universe and rebuilds `dashboard\index.html`.
Company names and contract metadata come directly from IBKR. See
`docs\TRUE-POSITIVE-ROADMAP.md` for the prioritized path from market-factor
ranking to a calibrated paper-trading candidate.

To add point-in-time SEC fundamentals to that same refresh, identify the
application with a real contact address first:

```powershell
$env:SEC_USER_AGENT = "StockForge your-real-email@example.com"
.\REFRESH-IBKR-DASHBOARD.cmd
```

The ranking then incorporates annual revenue growth, operating and net
margins, free-cash-flow margin, liabilities-to-assets, and return on assets.
Only facts filed by the scan date are eligible, preventing future filings from
leaking backward into historical decisions. SEC responses are cached under
`ml\data\sec-cache`.

## IBKR paper trading history

Every dashboard refresh also asks TWS for the paper executions currently
available through the API. New fills are merged into the append-only local
journal at `ml\data\ibkr-executions.json`; execution IDs prevent duplicates.
StockForge matches long buys and sells FIFO, includes reported commissions,
and displays closed trades, realized P/L, win rate, average trade P/L, and
open-position accounting on the dashboard.

TWS execution queries do not provide a complete lifetime statement. The local
journal becomes complete from the point this feature is first run and kept
regularly refreshed. Older account activity requires a separate IBKR statement
or Flex Query import.

The dashboard header includes a live `US MARKET OPEN` / `US MARKET CLOSED`
indicator. It evaluates the scheduled NYSE regular session in New York time,
including weekends, standard exchange holidays, and common 1:00 PM ET early
closes. It does not detect emergency market-wide or single-stock halts.

Each stock now has a paper-trade readiness checklist. The scanner automatically
checks eligibility, risk-on regime, score of at least 75, available
point-in-time fundamentals, risk quality of at least 60, fresh data, and a
completed daily session. A stock remains `NOT READY` until provider-backed
checks also find no earnings within two trading days and no configured adverse
news flag after the completed market session.

Automated earnings and news gates use Alpha Vantage `EARNINGS_CALENDAR` and
`NEWS_SENTIMENT`. Configure a key before refreshing:

```powershell
[Environment]::SetEnvironmentVariable(
  "ALPHAVANTAGE_API_KEY",
  "your-alpha-vantage-key",
  "User"
)
```

The refresh checks the earnings calendar for every stock and post-session news
for the top ten base-qualified candidates. Missing, stale, rate-limited, or
unmatched evidence fails closed. A news pass means the configured provider and
heuristic found no flag; it does not prove that no adverse information exists.

## Project layout

- `config/` — research, universe, risk, data, and broker settings
- `dashboard/` — static decision console
- `data/` — cached provider data and latest scan output
- `docs/` — architecture, operations, validation, and decisions
- `reports/` — SEC dossiers and future backtest reports
- `strategy/StockForge.psm1` — indicators, scoring, gating, and sizing
- `ml/` — Python alpha model, meta-labeler, walk-forward validation, model
  registry, and portfolio-risk package
- `tools/Invoke-StockForge.ps1` — market scanner and dashboard exporter
- `tools/Get-SecDossier.ps1` — official filing-data research tool
- `tools/Submit-AlpacaPaperOrder.ps1` — paper-only guarded order adapter
- `tools/Test-StockForge.ps1` — deterministic offline test suite

## Important limitations

No system can use literally every piece of stock-market information. Private
order flow, licensed feeds, analyst research, management information, and
unknown future events are not available to this project. Data may be delayed,
incorrect, revised, or affected by splits and corporate actions. Rankings are
model outputs, not facts, and historical relationships can fail abruptly.

Paper trading, walk-forward validation, realistic costs, and independent review
are required before any live deployment.
