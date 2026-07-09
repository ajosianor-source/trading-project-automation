# SignalForge validation report

Validation date: 29 June 2026  
Broker data: FTMO-Demo  
Account model: USD 10,000, 1:100 leverage  
Execution: MT5 “Every tick based on real ticks”, random delay  
Risk: 0.5% of current equity per trade  
Rules: frozen before examining the held-out period

## Results

| Instrument | Period | Tick quality | Trades | Net profit | Profit factor | MT5 Sharpe | Max equity drawdown | Decision |
|---|---|---:|---:|---:|---:|---:|---:|---|
| EURUSD | Jan 2023–Jun 2026 | 99% | 183 | $289.63 | 1.05 | 0.54 | 7.22% | Weak |
| EURUSD | May 2025–Jun 2026 held out | 100% | 66 | -$135.24 | 0.94 | -0.70 | 7.19% | Reject |
| GBPUSD | Jan 2023–Jun 2026 | 99% | 200 | -$729.56 | 0.89 | -1.39 | 12.83% | Reject |
| XAUUSD | Jan 2023–Jun 2026 | 99% | 196 | $1,117.19 | 1.20 | 2.42 | 10.74% | Candidate |
| XAUUSD | May 2025–Jun 2026 held out | 100% | 70 | $1,065.21 | 1.63 | 6.60 | 2.48% | Pass to demo |

GBPUSD did not receive a held-out run because it already failed the broader
sample. Continuing to test variants after that failure would increase selection
bias without strengthening the original hypothesis.

## Decision

Only XAUUSD is enabled by default in EA version 1.20. EURUSD and GBPUSD are not
approved for alerts or demo execution using this rule set. They remain visible
in the browser only as research/demo instruments.

The XAUUSD result qualifies the strategy for forward observation on a demo
account. It does **not** qualify it for real-money execution and does not imply
that future trades will match the historical results.

## Next gate

Run XAUUSD unchanged on the FTMO demo account for at least 30 calendar days:

- keep risk at 0.5% or lower;
- record every generated signal, including skipped orders;
- compare actual spread, fill, and slippage with the tester;
- reject or pause the model if live-demo behavior materially diverges;
- do not adjust parameters during the observation window.

The generated MT5 HTML reports are archived under `../mt5/reports`.
