# Architecture

## Decision flow

```text
Price history ───────┐
Company overview ────┤
News sentiment ──────┼─> normalized factor scores ─> hard risk gates ─> ranking
Benchmark regime ────┤                                      │
Portfolio limits ────┘                                      └─> ATR risk plan

SEC EDGAR dossier ─────────────────────────────────────────────> human review

Eligible candidate ─> dry-run order ─> paper safety gates ─> Alpaca paper API
```

## Why scoring and eligibility are separate

A high aggregate score must not cancel a critical failure. A stock can rank
well and still be ineligible because its data is stale, liquidity is too low,
or volatility exceeds the configured ceiling. This makes the system easier to
audit and reduces false confidence from a single blended number.

## Current factor weights

| Component | Weight |
| --- | ---: |
| Technical | 35% |
| Fundamental | 30% |
| Risk quality | 20% |
| News sentiment | 10% |
| Market regime | 5% |

The weights are configuration, not optimized truth. They must be validated
without using holdout data for tuning.

## Provider boundaries

- Alpha Vantage supplies daily prices, company overview fields, and news
  sentiment.
- SEC EDGAR supplies public filing history and extracted XBRL facts for
  independent review.
- Alpaca is implemented only as a paper-order endpoint.
- Interactive Brokers is a future broker adapter candidate, particularly for a
  UK-based account, but is not implemented.

Credentials are read only from environment variables. They are never accepted
as command-line arguments or written to output files.

## Machine-learning research layer

The optional `ml/` package implements the alpha/meta-label architecture without
replacing the deterministic scanner:

- stationary trailing features and strict OHLCV validation
- forward labels with an explicit estimated-cost hurdle
- chronological splits with an embargo around validation windows
- alpha predictions generated out of fold before meta-label training
- a second out-of-fold evaluation for the meta-labeler
- probability, freshness, volatility, liquidity, and short-selling gates
- ATR sizing, exposure limits, a position-count limit, and daily-loss breaker
- versioned model artifacts with SHA-256 manifests and restricted `skops`
  loading

Only research decisions and paper-order intents are produced. Model training
cannot promote itself and the Python package has no live broker implementation.
