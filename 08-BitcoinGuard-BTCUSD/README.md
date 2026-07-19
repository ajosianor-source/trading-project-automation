# Bitcoin Guard: Project 08

An independent, production-grade MetaTrader 5 Expert Advisor specifically optimized for trading **BTCUSD** (Bitcoin) on Exness. It is completely separate from projects `01` through `07`.

## Purpose

- **Dedicated Bitcoin Optimization**: Tailored specifically for Bitcoin's 24/7 trading cycle, high volatility, and unique contract specifications on Exness.
- **Independent Codebase**: Keeps Project 08 isolated from the Gold-focused projects (`03` and `05`) to prevent parameter pollution and allow independent development.
- **Micro-Account Support**: Includes a dedicated live preset optimized for a small $300 account trading BTCUSDm.

## Key Features

- **24/7 Execution Cycle**: Optimized for continuous crypto trading, including weekend execution, while still avoiding high-spread rollover windows.
- **12-Factor Crypto Alignment**:
  - **Trend**: H4 EMA Trend (50/200) + H1 EMA Momentum (21/55).
  - **Entry**: M30 Donchian Channel breakout + RSI Momentum (60/40 bounds).
  - **Strength**: ADX ≥ 25 with directional +DI/-DI + ATR minimum.
  - **Volatility**: ATR must exceed the 60th percentile of the last 50 bars.
  - **Timing**: Avoids illiquid weekend rollover hours and high-spread windows.
  - **Trend Slope**: Fast EMA must be separated from the slow EMA by a minimum percentage.
  - **Candle Quality**: Previous M30 candle must have a strong body (low wick ratio).
  - **M5 Confirmation**: M5 timeframe must break its 5-bar levels.
  - **Stochastic Extremes**: K line must be >80 (buy) or <20 (sell).
  - **Tick Volume**: Current M30 bar tick volume ≥70% of 20-bar average.
- **Institutional Risk Controls**:
  - Sizes each position to risk no more than 0.02% of current equity (or custom risk).
  - Hard daily loss limit (0.15%) and persistent drawdown limit (1.0%).
  - Strict volume sizing (rounds down, never rounds up to exceed risk).
  - Economic Calendar News Guard (USD and BTC high-impact events).
  - Persistent state across MT5 restarts.

## Folder Structure

- `mt5/` — Contains the Expert Advisor source code (`ExnessBitcoinGuard.mq5`) and presets.
- `docs/` — Contains the validation plan and activity journal specifications.
- `dashboard/` — Contains the local monitoring dashboard files.
