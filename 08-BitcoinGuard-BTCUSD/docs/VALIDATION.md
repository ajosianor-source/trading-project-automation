# Bitcoin Guard Validation Plan (v1.00)

**Status**: Pre-release validation required  
**EA Version**: 1.00 (12-factor crypto accuracy system)  
**Target Instrument**: BTCUSDm (Exness Bitcoin)  

## Pre-Validation Checklist

### 1. Backtesting (Every Tick Based on Real Ticks)
Before running the EA on any live or demo account, complete a rigorous backtest:
- **Period**: At least January 2025 through the latest complete month.
- **Model**: "Every tick based on real ticks" (essential for accurate spread and slippage simulation).
- **Execution Delay**: Random (simulates real-world network latency).
- **Deposit**: Match your intended account size (e.g., $300 for micro, $10,000 for standard).
- **Leverage**: Match your broker account leverage (e.g., 1:100).
- **Expected Metrics**:
  - Profit Factor: ≥ 1.50
  - Win Rate: ≥ 45% (with a 1:2 risk-to-reward ratio)
  - Max Equity Drawdown: ≤ 1.5% (at 0.02% risk per trade)
  - Recovery Factor: ≥ 2.0

### 2. Signals-Only Observation (≥30 Days)
Attach the EA to a live BTCUSDm chart with trading disabled:
- `InpEnableTrading = false`
- `InpConfirmLiveAccount = false`
- Monitor the dashboard and verify:
  - Heartbeat updates every 2 seconds.
  - 12-factor alignment triggers correctly on M30 candle closes.
  - No false signals or missing alerts.
  - Collect at least 30 shadow trades to verify the statistical edge.

### 3. Micro-Account Trial (≥30 Days / 20 Trades)
Deploy the EA on a small live account (e.g., $300) with micro-lots:
- Load `ExnessBitcoinGuard_LIVE_MICRO_300.set`.
- Set `InpEnableTrading = true`.
- Set `InpConfirmLiveAccount = true`.
- Enter your live account number in `InpAuthorizedAccount`.
- Enter `I_ACCEPT_LIVE_RISK` in `InpLiveConfirmation`.
- Verify:
  - Realized risk per trade is strictly ≤ 0.02% (or your configured risk).
  - Stop Loss and Take Profit are applied correctly on every fill.
  - Average slippage is within acceptable bounds (< 50 points on BTCUSDm).
  - No emergency close events are triggered.
