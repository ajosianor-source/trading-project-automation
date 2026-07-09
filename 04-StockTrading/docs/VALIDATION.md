# Validation plan

The offline test verifies numerical bounds, indicator generation, position caps,
result counts, output creation, and synthetic-data labelling. That establishes
software consistency, not trading profitability.

Before considering live deployment:

1. Build point-in-time datasets with delisted stocks included.
2. Adjust prices and volumes for splits and corporate actions.
3. Prevent look-ahead by using filing availability dates, not period-end dates.
4. Separate development, validation, and untouched holdout periods.
5. Run walk-forward tests across bull, bear, high-volatility, and sideways
   regimes.
6. Include commissions, spread, slippage, partial fills, latency, taxes, and
   borrow constraints where applicable.
7. Compare against SPY and simple equal-weight/momentum baselines.
8. Measure CAGR, volatility, Sharpe/Sortino, maximum drawdown, turnover,
   capacity, win/loss distribution, and tail loss.
9. Stress weight sensitivity and remove each factor in turn.
10. Paper trade long enough to cover earnings events and regime changes.

Promotion requires predeclared acceptance thresholds. A strong backtest alone
is not sufficient evidence.

The Python ML package adds automated checks for feature validity, chronological
alpha/meta training, CVaR, position caps, duplicate-position blocking, and
hashed model round-trips. See `ML-PROMOTION.md` for the stage gates.
