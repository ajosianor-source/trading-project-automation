# Project decisions

## Accepted

- Use a transparent multi-factor ranker rather than an opaque single prediction.
- Keep eligibility gates separate from aggregate scoring.
- Keep the dependency-free PowerShell scanner as the operational baseline.
- Use the installed `uv` runtime with an isolated Python 3.14 environment for
  machine-learning research.
- Use environment variables for credentials.
- Default to research mode with order routing disabled.
- Implement only paper-order routing in the first version.
- Keep Python model training incapable of promoting or routing itself.
- Use chronological, embargoed validation for both alpha and meta models.
- Store model candidates with SHA-256 manifests and restricted `skops` loading.
- Use IBKR TWS or IB Gateway—not IBKR Desktop—as the socket API host.
- Keep the IBKR adapter local, paper-only, and read-only during integration.
- Expand the configured live research universe to 50 liquid US stocks.
- Treat SEC XBRL as an extraction aid and official filings as the review source.

## Pending user decisions

- Trading horizon: daily swing, weekly position, or long-term
- Eligible exchanges and account jurisdiction
- Broker for eventual live deployment
- Portfolio value, acceptable drawdown, and loss limits
- Whether ETFs, ADRs, REITs, and small caps belong in the universe
- Licensed real-time/adjusted market-data provider
- Exact validation thresholds required for promotion
