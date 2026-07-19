# Exness Guard Validation (v1.41)

**Status**: Pre-release validation required  
**EA Version**: 1.42 research (9–12/12 mixed score + MSS/FVG Order Block gate)
**Last Updated**: 9 July 2026  
**Prior v1.32 Results**: See archived validation below  

## v1.41 change-control boundary

## v1.42 mixed-score evidence boundary

Version 1.42 is a new population and must not inherit v1.41 performance claims.
Eligible 9/12, 10/12, 11/12 and 12/12 signals retain the core direction gates
and validated MSS/FVG Order Block. Every pending order, fill and shadow result
is tagged with its original score. Review each score tier separately and do not
promote a tier until it independently has a meaningful forward sample.

Version 1.41 retains every v1.40 factor and safety control. With
`InpRequireValidatedOB=true`, a 12/12 direction is executable only when it
matches a still-valid fractal-3 MSS and immediate FVG-validated Order Block.
The order is a pending limit at the OB body boundary with a two-tick
wick-offset stop and fixed 3R target. This is a new strategy population:
v1.40 results must not be presented as v1.41 evidence.

Run separate development, holdout and signals-only forward windows. Verify:

- MSS occurs only when a completed M30 close crosses the latest confirmed
  fractal-3 swing.
- The selected OB is the last opposite-colour candle before the MSS.
- The matching FVG completes two or three candles after the OB.
- Invalidated and expired zones cancel both real and shadow pending limits.
- Every filled limit retains its original SL and 3R TP.
- Dashboard schema 3 matches the Experts journal for MSS, FVG, OB and order
  lifecycle events.

## Pre-Validation Checklist (Required Before Any Mode)

### Signals-Only Mode (REQUIRED FIRST)

Before enabling live trading or live observation, complete this validation:

1. **Backtest 12-Factor System** (3–5 days)
   - Run full 6-month backtest: Jan–Jun 2026
   - Model: "Every tick based on real ticks"
   - Symbol: XAUUSDm or BTCUSDm
   - Verify results vs v1.32 baseline
   - Expected: 50–60% fewer trades, higher win rate (58–65%), profit factor ≥2.0

2. **Live Signals-Only Observation** (≥60 calendar days)
   - Attach EA with `InpEnableTrading = false` (signals-only mode)
   - Keep `InpConfirmLiveAccount = false` (no account verification)
   - Open dashboard (`dashboard/index.html`) connected to EA's `live.json` feed
   - Monitor alerts and signal timing
   - Collect ≥50 closed M30 signals (minimum 50–100 trades depending on market)
   - **Track**:
     - Alert reliability: all alerts fire correctly, no missed M30 closes
     - Factor alignment: 12/12 factors align only before true entries (no false signals)
     - Dashboard sync: all factor labels update correctly, countdown timer accurate

3. **Shadow Trading Statistics** (Within signals-only mode)
   - EA paper-tracks each signal as a virtual trade
   - Collect at least 50 closed shadow trades
   - Metrics to validate:
     - **Win rate**: ≥55% (indicates edge)
     - **Profit factor**: ≥1.8 (sustainable)
     - **Max drawdown**: ≤0.15% of shadow equity
     - **Consecutive losses**: ≤4 (acceptable losing streak)
   - If any metric fails: stop, do NOT advance to live trading

---

### Live Trading Mode (ONLY AFTER SIGNALS-ONLY PASSES)

**Prerequisite**: Signals-only mode passed all validations above  
**Time requirement**: ≥60 calendar days minimum observation

**Go-Live Checklist**:

1. **Account Setup**
   - Load `ExnessGoldGuard_LIVE_ENTER_ACCOUNT.set` preset
   - Set `InpConfirmLiveAccount = true`
   - Enter live account number in `InpAuthorizedAccount`
   - Enter confirmation phrase `I_ACCEPT_LIVE_RISK` in `InpLiveConfirmation`
   - Keep `InpEnableTrading = false` initially (micro-trade validation first)

2. **Micro-Account Trial** (Optional but recommended)
   - Use a micro trading account (0.01–0.1 lot minimum)
   - Load `ExnessGoldGuard_LIVE_MICRO_300.set` preset
   - Enable `InpEnableTrading = true` (very low risk exposure)
   - Run for ≥20 trades and 30 days
   - Verify:
     - Execution fills match tester slippage assumptions (<5 points average)
     - Protection (SL/TP) sets correctly on every fill
     - No emergency close events
     - Realized risk ≤0.02% per trade

3. **Full Live Trading** (If micro-trial succeeds)
   - Upgrade to `ExnessGoldGuard_LIVE_ENTER_ACCOUNT.set`
   - Set position size to configured risk (0.02% default)
   - Monitor continuously for first 10 trades
   - **Red flags** (stop trading immediately):
     - Slippage consistently >10 points (broker issue)
     - Missing SL/TP protection
     - Profit factor <1.0 in first 20 trades (edge degradation)
     - Realized risk >0.03% per trade (sizing error)
     - Dashboard feed missing heartbeat >5 minutes (EA crash)

---

## v1.32 Historical Validation Results

**Validation date**: 3 July 2026  
**Broker/server**: Exness-MT5Real9  
**Symbols**: XAUUSDm and BTCUSDm  
**Tester model**: Every tick based on real ticks, random execution delay  
**Test deposit**: USD 1,000,000  
**Risk**: 0.02% of current equity per trade

### v1.32 Backtest Results

| Instrument | Period | Real-tick % | Trades | Net profit | Profit factor | Win rate | Max drawdown | Status |
|---|---|---:|---:|---:|---:|---:|---:|---|
| XAUUSDm | June 2026 smoke (2wk) | 62% | 7 | $936.29 | 2.71 | 57.14% | 0.09% | Mechanical pass |
| XAUUSDm | Jan–Mar 2026 dev (3mo) | 0% | 118 | $12,433.93 | 2.13 | 51.69% | 0.16% | Generated ticks |
| XAUUSDm | Apr–Jun 2026 holdout (3mo) | 20% | 20 | $1,876.14 | 2.01 | 50.00% | 0.09% | Forward candidate |
| BTCUSDm | June 2026 smoke (2wk) | 100% | 3 | -$13.95 | 0.96 | 33.33% | 0.03% | Insufficient data |
| BTCUSDm | Jan–Mar 2026 dev (3mo) | 100% | 104 | $3,479.37 | 1.28 | 39.42% | 0.24% | Weak pass |
| BTCUSDm | Apr–Jun 2026 holdout (3mo) | 100% | 18 | $466.75 | 1.21 | 38.89% | 0.11% | Borderline |

### v1.32 Decision

Neither instrument was approved for live automation. XAUUSDm showed stronger results but lacked recent real-tick data; BTCUSDm showed weak edge. Both required signals-only observation before consideration.

---

## v1.41 Validation Plan

**Expected Changes from 12-Factor System**:
- Trade frequency: ↓ 50–60% (tighter filtering)
- Win rate: ↑ 55–65% (higher quality entries)
- Profit factor: ↑ 2.2–2.5 (reduced whipsaws)
- Max drawdown: ↓ 0.08–0.10% (smoother curve)

**v1.41 Backtest** (required before any v1.41 live use):
- Re-run full 6-month Jan–Jun 2026 on both symbols
- Compare profit factor, win rate, drawdown vs v1.32
- If profit factor <1.8 on holdout, investigate parameter tuning before live

**Validation Decision Tree**:
1. ✅ Backtest shows edge → Proceed to signals-only observation
2. ✅ 60+ days signals-only with 50+ trades → Run micro-account trial
3. ✅ Micro trial (20+ trades, realized risk ≤0.02%) → Approve full live trading
4. ❌ Any step fails → Adjust parameters and re-test

---

## Parameter Freeze During Validation

**DO NOT** modify parameters during the validation windows:
- No adjusting `InpATRPercentile`, `InpBlockStartHour`, `InpEMASlopeMinPercent`, etc.
- No tweaking `InpBuyRSI`, `InpSellRSI`, `InpMinimumADX`
- If results deteriorate: accept the loss and redesign in a new version

Parameter changes during validation invalidate the entire forward test.
