# SignalForge research notes

## Conclusion

There is no indicator, platform, or model that can produce only winning signals.
The strongest practical design is a small, explainable rule set that:

1. uses only completed candles;
2. trades only when trend, momentum, strength, and a breakout agree;
3. sizes risk from current volatility;
4. includes spread, slippage, commission, and latency in testing;
5. survives a genuinely unseen forward period and then a demo account.

Adding more correlated indicators does not add independent evidence. MACD, moving
averages, and many oscillators are transformations of the same price history.

## Platform findings

### MetaTrader 5

MT5 is the production target because the broker feed, multi-currency testing,
real-tick testing, delay simulation, forward optimization, and execution are in
one environment. Its official tester supports multiple symbols and a separated
forward period. “Every tick based on real ticks” is the appropriate final test
mode.

### TradingView

TradingView is useful for visual research and alerts. Its official documentation
warns that realtime, unconfirmed values and improperly requested higher-timeframe
data can repaint. Waiting for a confirmed bar improves reproducibility but adds
delay. SignalForge follows the same principle by reading MT5 shift 1, never the
forming candle at shift 0.

### cTrader

cTrader is capable of custom indicators and automated strategies, but changing
platform does not improve the predictive content of an indicator. Broker data,
execution, and a correct test matter more than the UI.

### NinjaTrader and QuantConnect

NinjaTrader's Strategy Analyzer explicitly models commissions and slippage and
supports walk-forward optimization. QuantConnect's research guidance warns that
repeated backtests and excess parameters cause overfitting. Those controls are
methodological requirements, not platform-specific advantages.

## Evidence used

Moskowitz, Ooi, and Pedersen documented time-series momentum across 58 liquid
equity-index, currency, commodity, and bond futures. This supports using a trend
core for EUR/USD, GBP/USD, and gold, but does not prove a particular H1 parameter
set or guarantee future returns.

Sullivan, Timmermann, and White showed why technical-rule selection must account
for data snooping. Testing many variations and publishing only the winner creates
an exaggerated result. SignalForge therefore uses a compact hypothesis-driven
model and requires forward testing.

## Strict signal definition

A BUY is emitted only after the H1 candle closes and all five checks pass:

- H1 EMA 20 is above EMA 50, price is above EMA 20, and EMA 20 is rising;
- RSI(14) is between 52 and 70;
- ADX(14) is at least 22 and +DI is above -DI;
- H4 EMA 50 is above EMA 200, using the completed H4 candle;
- the H1 close exceeds the prior 20 completed candles' highs.

A SELL uses the exact inverse. ATR(14) does not predict direction; it sets the
1.5 ATR stop and 3 ATR target. The displayed score is rule agreement, not a win
probability.

## Required validation

- Test at least five years if broker history permits.
- Reserve the latest one-third as a forward period.
- Use real ticks and realistic delay.
- Reject results with too few trades to estimate performance.
- Review each pair separately and as a combined portfolio.
- Record precision, expectancy in R, profit factor, maximum drawdown, and
  performance by year; do not optimize for win rate alone.
- Forward-test unchanged settings on a demo account before considering any
  further execution permissions.
