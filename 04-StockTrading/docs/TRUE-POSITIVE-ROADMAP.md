# StockForge true-positive roadmap

No trading model can guarantee true positives. For StockForge, a true positive
should be defined before training:

> An approved long candidate whose forward return exceeds spread, slippage,
> commissions, and the configured return hurdle within the chosen holding
> period, without first breaching its risk barrier.

The primary model objective should be **precision among approved trades**, not
the number of signals. The system should abstain frequently when evidence is
weak.

## Current evidence

Available:

- two years of dividend/split-adjusted daily IBKR OHLCV
- full IBKR company names, contract IDs, industry/category, trading hours, and
  exchange metadata
- trend, momentum, relative strength, RSI, volatility, ATR, drawdown,
  liquidity, volume, and SPY regime factors
- deterministic eligibility and portfolio-risk gates

Missing from the current dashboard score:

- point-in-time company fundamentals
- earnings dates, surprises, and estimate revisions
- filing changes and material 8-K events
- news sentiment and event classification
- current bid/ask spread and real-time execution conditions
- a trained and promoted alpha/meta model

## Priority 1 — evidence completeness

1. Build point-in-time SEC features using filing acceptance timestamps:
   revenue growth, margins, free cash flow, leverage, dilution, accruals, and
   return on invested capital.
2. Add earnings calendar and post-earnings blackout/risk rules.
3. Query IBKR news providers and classify headlines into earnings, guidance,
   litigation, regulation, M&A, product, and macro events.
4. Add current quote/spread checks. Reject candidates when the quote is stale,
   spread is excessive, or the market is closed.
5. Add sector-relative scoring so the model does not compare banks, software,
   and healthcare using inappropriate absolute thresholds.

## Priority 2 — probability quality

1. Define separate 5-day, 20-day, and 60-day targets rather than one vague
   “buy” label.
2. Use triple-barrier labels with profit, stop, and time barriers.
3. Train the alpha model chronologically.
4. Train the meta-labeler only on out-of-fold alpha predictions.
5. Calibrate probabilities on a separate chronological calibration window.
6. Choose thresholds from precision-recall curves, with a minimum sample-size
   requirement and a predeclared precision target.
7. Display calibrated probability, expected return, expected shortfall, and
   uncertainty separately from the deterministic composite score.

## Priority 3 — bias-resistant validation

- point-in-time index constituents, including delisted stocks
- split/dividend-adjusted prices and corporate-action checks
- filing availability dates rather than fiscal period dates
- embargoed walk-forward folds across bull, bear, sideways, and crisis regimes
- spread, commissions, slippage, latency, partial fills, and taxes where
  applicable
- comparison against SPY, equal weight, and simple momentum baselines
- feature ablation, parameter sensitivity, sector concentration, and capacity
- untouched final holdout data used once

## Priority 4 — paper execution

Only after research acceptance:

- promote one immutable model hash manually
- use IBKR paper credentials only
- start with limit orders and whole shares
- verify market hours, quote freshness, spread, buying power, existing
  positions, and open orders
- attach server-side protective exits where supported
- enforce maximum daily loss, portfolio exposure, sector exposure, position
  count, and order notional
- reconcile every order, fill, cancellation, and position with IBKR
- provide an immediate kill switch and automatic demotion to shadow mode

## Promotion evidence

Run shadow mode first, then paper mode for enough observations to cover
earnings events and changing regimes. Promotion must depend on out-of-sample
precision, calibration, drawdown, turnover, stability, and operational
reliability—not headline return or a short winning streak.
