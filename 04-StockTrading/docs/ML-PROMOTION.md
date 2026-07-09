# Machine-learning promotion policy

A trained artifact is always a **candidate**. Training success cannot promote
it to paper or live execution.

## Stage 0 — data acceptance

- Point-in-time membership includes delisted stocks.
- Prices and volumes are adjusted consistently for corporate actions.
- Fundamental and filing features use their public availability timestamps.
- Vendor timestamps, timezone, exchange calendar, and missing-data rules are
  documented.
- Training data is checksummed and immutable.

## Stage 1 — research acceptance

- Chronological validation includes an embargo at least as long as the label
  horizon.
- Alpha and meta-label metrics are computed out of fold.
- Probabilities are evaluated with Brier score and reliability plots.
- Results beat simple SPY, equal-weight, and momentum baselines after costs.
- Performance is not dependent on one symbol, sector, year, or market regime.
- Feature ablation and parameter sensitivity do not reveal a narrow optimum.
- Turnover, spread, slippage, and capacity assumptions are realistic.

Exact pass thresholds must be written down before examining holdout results.

## Stage 2 — shadow mode

The candidate consumes live data and records decisions but cannot create order
intents. Compare predicted prices, timestamps, market state, and fills against
independent broker data.

## Stage 3 — paper mode

- A human explicitly promotes a model-version hash.
- Paper credentials and paper endpoint are independently verified.
- Duplicate-position, stale-data, daily-loss, exposure, and kill-switch tests
  pass.
- Paper performance covers multiple earnings events and market regimes.
- Operational failures, rejected orders, partial fills, and reconnects are
  tested.

## Stage 4 — live review

Live execution is not implemented. Adding it requires a separate threat model,
broker-specific reconciliation, regulatory/tax review, disaster recovery,
monitoring, alerting, approval workflow, and a new implementation review.

## Automatic demotion

A paper candidate must return to shadow mode after:

- data-schema or provider changes
- model/library/environment changes
- hash or manifest mismatch
- unexplained feature drift
- calibration deterioration
- breached drawdown or loss limits
- repeated broker/session discrepancies
