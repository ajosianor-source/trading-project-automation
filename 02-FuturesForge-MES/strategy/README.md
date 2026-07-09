# Strategy engine

`FuturesForgeMES.cs` is the first NinjaTrader 8 research strategy.

## Safety state

- It accepts only the MES master instrument on a 5-minute series.
- Realtime execution accepts only `Sim101` and `Playback*` accounts.
- Any live account is rejected and terminates the strategy.
- Position quantity is hard-coded to one contract.
- Stop, target, daily loss, trade-count, and consecutive-loss controls are
  enabled.
- Positions are closed before the configured session ends.

## Frozen v0.1 hypothesis

The strategy records the MES 08:30–09:00 Chicago opening range, calculates a
session VWAP from bar volume, and considers a breakout only from 09:00–11:30
Chicago time:

- Long: close crosses above the range plus confirmation and is above VWAP.
- Short: close crosses below the range minus confirmation and is below VWAP.
- Defaults: 20-tick stop, 40-tick target, one-tick confirmation, three entries
  maximum, three consecutive losses maximum, and a $250 strategy loss halt.
- Any remaining strategy position is flattened at 15:00 Chicago time.

These are research definitions, not validated trading rules.

## v0.2 filtered experiment

`FuturesForgeMESv02.cs` preserves v0.1 and adds independently switchable EMA,
ATR, opening-range-width, and breakout-candle filters. Its defaults are frozen
in `../RESEARCH.md`. It uses the same Sim101/Playback-only account lock and
must be compiled and tested as a separate strategy.

## Installation and validation

Copy `FuturesForgeMES.cs` into:

`Documents/NinjaTrader 8/bin/Custom/Strategies/`

Compile it in NinjaTrader's NinjaScript Editor. Run Strategy Analyzer on an
MES 5-minute series with commissions enabled and realistic slippage, then use
Playback and Sim101. Do not alter the account lock until holdout, replay, and
forward-simulation evidence has been reviewed.
