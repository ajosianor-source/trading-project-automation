# StockForge ML

This package implements the supplied alpha/meta-label/risk architecture for
stocks. It is a research pipeline, not a live trading bot.

## Layers

1. `features.py` validates OHLCV and creates trailing, stationary features.
2. `labels.py` creates future-return training labels with an explicit cost
   hurdle.
3. `training.py` uses chronological, embargoed out-of-fold predictions.
4. `models.py` defines separate alpha and meta-label classifiers.
5. `decision.py` applies probability, freshness, volatility, liquidity, and
   short-selling gates.
6. `risk.py` applies portfolio exposure, position count, daily-loss, and
   ATR-based sizing limits.
7. `broker.py` creates paper-only limit-order intents and blocks duplicates.
8. `registry.py` writes versioned, hashed model artifacts using `skops`.
9. `ibkr.py` provides local, paper-only diagnostics and historical bar
   retrieval through the official TWS API, with no order method.

## Candidate training

The CSV must contain `timestamp,symbol,open,high,low,close,volume` and include
the benchmark symbol:

```powershell
uv run python .\scripts\train_model.py `
  --bars .\data\point-in-time-bars.csv `
  --output .\artifacts\candidates
```

Training creates a candidate artifact, hash manifest, and out-of-fold report.
It never promotes or routes the model.

Score recent data without creating an order:

```powershell
uv run python .\scripts\score_latest.py `
  --bars .\data\recent-bars.csv `
  --artifact .\artifacts\candidates\stockforge-VERSION.skops `
  --manifest .\artifacts\candidates\stockforge-VERSION.json `
  --account-equity 10000
```

## Environment

```powershell
cd .\ml
uv sync
uv run pytest
```

The optional official Alpaca SDK is isolated in the `broker` dependency group:

```powershell
uv sync --group broker
```

Installing that group does not enable order routing. Paper credentials and the
existing StockForge execution gates are still required.

## IBKR paper connection

After completing `docs\IBKR-SETUP.md` from the project root:

```powershell
uv run python .\scripts\diagnose_ibkr.py
uv run python .\scripts\fetch_ibkr_bars.py --symbols SPY AAPL MSFT
```

TWS uses paper port `7497`; IB Gateway uses paper port `4002`.

## Important design constraints

- No random train/test splitting
- No backward filling of market features
- No model trained on its own in-sample predictions for meta-labeling
- No untrusted pickle/joblib model loading
- No live broker implementation
- No market order construction
- No execution when a symbol already has an open position
