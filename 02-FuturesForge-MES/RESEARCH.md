# MES research protocol

## Objective

Develop a session-aware MES research model without transferring assumptions or
parameters from the XAUUSD strategy.

## Initial hypotheses

1. Opening-range continuation after confirmation by session VWAP and volatility.
2. Mean reversion to VWAP only in separately identified range regimes.
3. Trend-following and mean-reversion models must remain separate during
   validation.

These are hypotheses, not trading rules, until tested.

## Frozen experiment: OR-VWAP v0.1

The first executable experiment is implemented in
`strategy/FuturesForgeMES.cs`:

- Instrument: MES only
- Bars: 5-minute
- Opening range: 08:30–09:00 America/Chicago
- Entry window: after 09:00 and before 11:30 America/Chicago
- Long trigger: close crosses one tick above the range and remains above VWAP
- Short trigger: close crosses one tick below the range and remains below VWAP
- Initial stop: 20 ticks (5.00 index points)
- Initial target: 40 ticks (10.00 index points)
- Quantity: one contract

The experiment must remain unchanged through its first development/validation
split so results are not contaminated by iterative parameter fitting.

### v0.1 baseline result

The 2024-01-01 through 2026-06-30 continuous-contract backtest rejected the
unfiltered hypothesis:

- 1,118 trades
- 31.13% profitable
- USD -4,775.45 net result
- 0.78 profit factor
- USD -5,073.65 maximum drawdown
- Both long and short sides lost money

v0.1 remains unchanged as the control.

## Frozen experiment: OR-VWAP v0.2

`strategy/FuturesForgeMESv02.cs` retains the v0.1 entry concept but adds four
independently switchable filters:

- EMA 20/50 alignment plus a three-bar EMA slope check
- ATR(14) between 1.5 and 12.0 index points
- Opening-range width between 4.0 and 25.0 index points
- Breakout candle body at least 55% of its range, closing in the directional
  outer quartile

Trade frequency is reduced to one entry per day. Stop and target remain frozen
at 20 and 40 ticks so the filter experiment is not mixed with exit fitting.

Development period: 2024-01-01 through 2025-06-30.

Holdout period: 2025-07-01 through 2026-06-30. Do not inspect or tune against
this period until the development-period filter tests have been recorded.

### Precommitted v0.2 gates

The combined default filters advance from development only if all of these are
met after configured commission and one tick of slippage:

- At least 150 completed trades
- Profit factor of at least 1.15
- Positive net profit
- Average trade of at least USD 3.00
- Maximum drawdown no worse than USD -1,500

If development passes, the unchanged strategy advances to holdout. Holdout
requires positive net profit, profit factor of at least 1.05, positive average
trade, and maximum drawdown no more than 1.5 times the development drawdown.
Failure rejects the combined v0.2 hypothesis; it does not authorize parameter
optimization against the holdout.

## Data requirements

- Continuous research series with documented back-adjustment method
- Individual contract data for execution testing
- Contract rollover dates and liquidity transition
- At least one-minute bars; tick data for final execution tests
- Exchange timezone and holiday/session calendar
- Bid/ask or realistic spread, commissions, fees, and slippage

## Validation stages

1. Freeze definitions before testing.
2. Split development, validation, and untouched holdout periods.
3. Test long and short trades separately.
4. Run walk-forward and parameter-stability tests.
5. Stress commissions, spread, slippage, latency, and missed fills.
6. Test contract rollovers and shortened holiday sessions.
7. Run Monte Carlo trade-order and return-path simulations.
8. Paper trade unchanged for at least 60–90 days.

No live deployment should be considered from a profitable backtest alone.
