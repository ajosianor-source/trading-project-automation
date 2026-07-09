# Activity journal

Exness Guard v1.32 maintains a persistent CSV audit trail in MT5 Common Files.
The journal is independent of dashboard, push and WhatsApp availability.

## Files

- XAUUSDm:
  `%APPDATA%\MetaQuotes\Terminal\Common\Files\ExnessGoldGuard\activity-xauusd.csv`
- BTCUSDm:
  `%APPDATA%\MetaQuotes\Terminal\Common\Files\ExnessGoldGuard\activity-btcusd.csv`

The EA appends records rather than replacing the file. Strategy Tester runs do
not write to the forward journal.

## Recorded fields

| Field | Meaning |
|---|---|
| `time_unix`, `time_server` | Broker-server event time |
| `event` | EA start/stop, H1 evaluation, alert, fill, order, exit, shadow trade or execution-quality record |
| `symbol` | Exact Exness broker symbol |
| `signal`, `trend` | Current decision and aligned trend |
| `buy_checks`, `sell_checks` | Passed entry conditions out of five |
| `bid`, `ask`, `spread_points` | Broker quote at the event |
| `balance`, `equity`, `risk_cash` | Account/risk snapshot |
| `position_side`, `position_volume`, `floating_pl` | Exposure snapshot |
| `message` | Human-readable event detail or block reason |

## Forward-review procedure

Review and back up the journal weekly. Do not edit strategy parameters during
the observation window. For each confirmed signal, reconcile:

1. Signal time and five-check state.
2. Quote and spread.
3. Whether execution was deliberately disabled or blocked.
4. Hypothetical/actual stop and target outcome.
5. If automated later, requested versus filled price and final P/L.

`SHADOW_ENTRY` and `SHADOW_EXIT` records are virtual forward observations.
Their entry, stop, target and R-multiple are also persisted in the dashboard
state, so an MT5 restart does not erase an open paper trade. `EXECUTION`
records contain real requested-price versus fill-price slippage and appear only
after an EA-managed order is filled.

After at least 30 XAUUSDm signals over 60 calendar days, calculate win rate,
profit factor, maximum drawdown, average spread, and the frequency of each
blocked reason before deciding on another version.
