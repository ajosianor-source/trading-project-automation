# Exness Guard validation

Validation date: 3 July 2026  
Broker/server: Exness-MT5Real9  
Symbols: XAUUSDm and BTCUSDm  
Tester model: Every tick based on real ticks, random execution delay  
Test deposit: USD 1,000,000  
Risk: 0.02% of current equity per trade  
Rules: frozen before the development and holdout reports were examined

## Results

| Instrument | Period | Real-tick quality | Trades | Net profit | Profit factor | Win rate | Max equity drawdown | Decision |
|---|---|---:|---:|---:|---:|---:|---:|---|
| XAUUSDm | June 2026 smoke | 62% | 7 | $936.29 | 2.71 | 57.14% | 0.09% | Mechanical pass only |
| XAUUSDm | Jan 2025–Mar 2026 development | 0% | 118 | $12,433.93 | 2.13 | 51.69% | 0.16% | Generated-tick evidence only |
| XAUUSDm | Apr–Jun 2026 holdout | 20% | 20 | $1,876.14 | 2.01 | 50.00% | 0.09% | Forward-observation candidate |
| BTCUSDm | June 2026 smoke | 100% | 3 | -$13.95 | 0.96 | 33.33% | 0.03% | Too small for a decision |
| BTCUSDm | Jan 2025–Mar 2026 development | 100% | 104 | $3,479.37 | 1.28 | 39.42% | 0.24% | Weak pass |
| BTCUSDm | Apr–Jun 2026 holdout | 100% | 18 | $466.75 | 1.21 | 38.89% | 0.11% | Borderline; signals only |

## Broker normalization found during testing

The initial absolute spread ceilings used point counts from a different symbol
format and rejected normal Exness quotes:

- XAUUSDm was corrected from 100 to 500 points ($0.50 maximum).
- BTCUSDm was corrected from 1,000 to 5,000 points ($50 maximum).

The ATR-relative spread limits remain active (12% for XAUUSDm and 10% for
BTCUSDm), so the larger absolute ceilings do not permit arbitrary spread.
These were unit-normalization corrections, not outcome-driven strategy tuning.

## Decision

Neither instrument is approved for unattended live automation.

XAUUSDm has the stronger model results, but Exness supplied real ticks only
from 12 June 2026 for the available test, leaving the development and most of
the holdout dependent on generated ticks. Run the frozen XAUUSDm profile in
signals-only mode for at least 30 closed trades and 60 calendar days.

BTCUSDm has high-quality real-tick data, but its edge is thin and its holdout
contains only 18 trades. Keep BTCUSDm signals-only until at least 50 forward
trades retain profit factor of 1.20 or better after spread, commission and
slippage.

Do not tune parameters during either observation window. Reject or redesign an
instrument if forward profit factor falls below 1.0, realized risk materially
exceeds 0.02% per trade, or execution behavior diverges from the tester.
