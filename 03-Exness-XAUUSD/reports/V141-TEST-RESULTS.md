# Exness Guard v1.41 Automated Test Results

Run date: 19 July 2026

Instrument: `XAUUSDm`

Tester timeframe: `M30`

Model: Every tick based on real ticks (`Model=4`)

Deposit/leverage: USD 1,000,000 / 1:500

## Development backtest

- Window: 1 January 2025 through 31 March 2026
- History quality: 0% real ticks; MT5 generated ticks because the broker has no
  real ticks for this period
- Bars/ticks: 14,662 / 109,223,614
- Validated 12/12 OB setups that submitted a limit: 1
- Filled trades/deals: 0 / 0
- Net profit: USD 0.00
- Profit factor: 0.00 (not statistically meaningful with zero trades)
- Maximum balance/equity drawdown: 0.00%
- Observed pending order: SELL LIMIT at 4706.235, SL 4734.828, TP 4620.456;
  cancelled without a fill

## Forward holdout

- Window: 9 April 2026 through 30 June 2026
- History quality: 100% real ticks
- Bars/ticks: 2,655 / 18,136,903
- Validated 12/12 OB setups that submitted a limit: 1
- Filled trades/deals: 0 / 0
- Net profit: USD 0.00
- Profit factor: 0.00 (not statistically meaningful with zero trades)
- Maximum balance/equity drawdown: 0.00%
- Observed pending order: SELL LIMIT at 4483.294, SL 4486.156, TP 4474.708;
  cancelled without a fill

## Decision

**NO-GO / insufficient evidence.**

Both runs completed successfully at the tester level, and the v1.41
MSS/FVG/Order Block path generated correctly structured pending orders.
However, neither order retraced to its exact body-boundary limit before the
zone was cancelled. Zero filled trades means win rate, profit factor, expected
payoff and drawdown cannot validate an edge.

Do not promote v1.41 to live execution from these results. Keep signals-only
mode enabled and collect more data. Any change to expiry, entry placement,
12-factor gating, MSS/FVG rules or Order Block invalidation creates a new test
version and requires fresh development and holdout runs.
