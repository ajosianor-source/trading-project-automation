# FuturesForge MES

Separate research project for CME Micro E-mini S&P 500 futures (`MES`).

This folder is intentionally isolated from SignalForge FX. It does not read,
modify, compile, or deploy any XAUUSD files.

## Current status

The first read-only research dashboard is available in `dashboard/index.html`.
It uses clearly marked simulated context and includes tick-aware sizing,
session state, risk limits, research hypotheses, and deployment gates.

No strategy has been validated and no order-routing connection is enabled.

The `FuturesForgeMES` NinjaScript v0.1 source is installed for NinjaTrader 8
simulation testing. It is hard-locked to Sim101 and Playback accounts; it will
terminate if attached to a live account.

Direct dashboard link:
`file:///C:/Users/nexfe/Desktop/Trading/02-FuturesForge-MES/dashboard/index.html`

## Planned product

- Exact futures contract and rollover handling
- Exchange-session calendar and maintenance windows
- Session VWAP and opening-range context
- Trend, volatility, and market-regime filters
- Tick-value-aware position sizing
- Daily loss, drawdown, trade-count, and news-event controls
- Paper-trading mode before any live integration
- Read-only dashboard and phone-alert health
- Full trade journal, slippage, and performance analysis

## Contract baseline

- Exchange: CME
- Product: Micro E-mini S&P 500 futures
- Root symbol: `MES`
- Contract multiplier: USD 5 times the S&P 500 Index
- Minimum tick: 0.25 index points
- Tick value: USD 1.25 per contract

Always confirm specifications with the selected broker and the current CME
contract page before deployment:
https://www.cmegroup.com/trading/equity-index/files/cme-micro-e-mini-futures-fact-card.pdf

## Folder map

- `config/` instrument and risk configuration
- `data/` documented datasets; large market data should not be committed
- `dashboard/` FuturesForge frontend
- `strategy/` signal and risk engine
- `reports/` backtest, walk-forward, and stress-test outputs

## Required decision

Choose the futures platform/data connection before implementation. A genuine
CME feed and paper-trading account are required; an index CFD feed is not an
equivalent substitute for MES validation.
