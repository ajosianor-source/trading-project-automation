# SignalForge FX

A dependency-free Forex signal research dashboard for:

- XAU/USD
- USD/JPY

The native EA currently enables **XAUUSD only**. Frozen real-tick validation
rejected the current EURUSD and GBPUSD rules; see `VALIDATION.md`. A broader
XAUUSD test later exposed a validation conflict, so the browser marks XAUUSD as
under review rather than production-ready. USDJPY remains visible as a rejected
carry-forward candidate that needs a separate model profile before it can be
considered again.

It combines multi-timeframe EMA trend alignment, RSI momentum, ADX strength, a
confirmed channel breakout, and ATR-based risk levels. It also includes a
deliberately conservative, simplified browser backtest. This is a research
tool—not a promise of accuracy or profit.

## Run

Open `dashboard/index.html` in a modern browser. No installation or build step
is needed.

Direct local link:
`file:///C:/Users/nexfe/Desktop/Trading/01-SignalForge-XAUUSD/dashboard/index.html`

S/R Map note: the dashboard now uses closed H1 candles only, confirmed swing
points, ATR zone clustering, level-strength scoring, breakout/retest labels,
and chart overlays. It is advisory and deliberately non-repainting: the live
forming candle is not allowed to create or move support/resistance zones.

## Import real candle data

Choose a pair and click **Import candle CSV**. The file needs at least 55 rows
and these headers (case-insensitive):

```csv
time,open,high,low,close
2026-01-02T10:00:00Z,1.25100,1.25220,1.24980,1.25180
```

`date`, `datetime`, or `timestamp` can be used instead of `time`. Unix timestamps
are accepted. MetaTrader exports using semicolons are also supported.

Import each instrument separately. The active pair receives the imported file.

## Browser rule set

- Buy: EMA 20 above EMA 50, close above EMA 20, positive EMA slope, RSI 52–70.
- Sell: inverse trend rules, RSI 30–48.
- Stop: 1.5 ATR.
- Target: 3 ATR (nominal 1:2 risk/reward).

The confluence score measures rule agreement. It is **not** a calibrated win
probability.

The native MT5 EA uses the stricter multi-timeframe rule documented in
`RESEARCH.md`: H1 trend, RSI, ADX/+DI/-DI, H4 trend, and a prior 20-bar channel
breakout must all agree on completed candles. ATR sizes the stop and target.

## Important limitations

The built-in backtest uses OHLC candles and assumes the stop was hit first if
both stop and target fall inside one candle. It excludes spread, slippage,
commissions, swaps, gaps, latency and broker execution. Before considering
automation, validate with broker-quality bid/ask data, walk-forward testing, and
a demo account. Keep live execution behind a separate manual enable switch.

## MetaTrader 5 Expert Advisor

The native EA is in `mt5/SignalForgeFX.mq5`. It monitors validated XAUUSD
settings using your broker's own H1 candles and displays the latest
closed-candle signal on the chart. It also:

- finds common broker symbol variants such as `EURUSD.a` or `XAUUSDm`;
- issues one alert per newly closed candle when a BUY or SELL setup appears;
- calculates position size from account equity and stop distance;
- blocks automated orders on every account except an MT5 demo account;
- leaves automated demo trading off by default.

### Install in MT5

1. In MT5, choose **File → Open Data Folder**.
2. Open `MQL5/Experts`.
3. Copy `mt5/SignalForgeFX.mq5` into that folder.
4. Open the file in MetaEditor and press **F7** to compile.
5. In MT5, refresh **Navigator → Expert Advisors**.
6. Drag **SignalForgeFX** onto one chart and allow algorithmic trading.

SignalForge v1.40 locks `InpEnableDemoTrading` to `true` for the FTMO demo
deployment, so an old chart profile cannot silently restore it to `false`.
Enable MT5's Algo Trading button for automatic demo orders. The EA contains a
second account-type check and refuses to place an order on a real account.

The current FTMO deployment also enforces login `1513884308` and an
`FTMO-Demo` server match. It exports explicit readiness telemetry and blocks
orders while H1/H4/D1/W1 history or indicators are warming up.

### Phone BUY/SELL notifications

The EA sends one combined push message when one or more confirmed signals appear.
`InpEnablePush` is on by default and `InpAlertOnStartup` is off, preventing an
old signal from being sent simply because the EA was attached.

1. Install the official MetaTrader 5 mobile app.
2. In the mobile app, open **Messages** and copy its **MetaQuotes ID**.
3. In desktop MT5, press **Ctrl+O** and open **Notifications**.
4. Enable push notifications, enter the MetaQuotes ID, and click **Test**.

### WhatsApp alerts

SignalForge v1.40 can send the same alert queue to WhatsApp through the
localhost-only relay in `tools/whatsapp-relay`. Twilio credentials remain in a
private `.env` file and are never stored in the EA. Follow
`tools/whatsapp-relay/README.md`, allow `http://127.0.0.1:8787` under
**MT5 Tools > Options > Expert Advisors**, and keep the relay running.
5. Leave the desktop MT5 terminal and SignalForge EA running.

MT5 supports up to four comma-separated MetaQuotes IDs. Push notifications are
not sent by the Strategy Tester; use its Journal to inspect historical signals.

Before changing any trading rule, use MT5's Strategy Tester with broker-quality
history and realistic spreads. Test each instrument and market regime
separately. Broker symbol aliases are detected automatically, but can also be
entered explicitly in `InpSymbols`.

## Version 1.30 candidate

The risk-and-execution hardened v1.30 candidate is installed alongside the
currently attached v1.20 EA. It has not replaced the running instance. Follow
`V130.md` to regression-test and migrate safely.

## Version 1.40 research model

`mt5/SignalForgeFX_v140.mq5` is a separate XAUUSD research fork. It adds daily
and weekly regime filters, ATR-percent volatility bounds, EMA separation,
slow-EMA slope, rollover-hour avoidance, and an ATR breakout buffer. It must
pass full-period and held-out validation before demo automation is considered.
Use `mt5/SignalForge_xauusd_v140.set` and `mt5/backtest-xauusd-v140.ini` in
Strategy Tester.

## Live dashboard

The live dashboard uses a separate read-only indicator, so it does not modify or
reinitialize the SignalForge v1.30 trading EA.

1. Refresh **Navigator → Indicators** in MT5.
2. Find **SignalForgeFX → SignalForgeMonitor**.
3. Drag it onto the same XAUUSD H1 chart. Keep its default inputs.
   > Important: this is the `SignalForgeMonitor` indicator, not the `SignalForgeFX_v140` EA or the strategy EA itself.
4. Confirm the Experts log says it is exporting
   `Common\Files\SignalForge\live.json`.
5. Open `dashboard/index.html` in current Microsoft Edge or Google Chrome.
6. Click **Connect MT5 live file**.
7. Select:
   `C:\Users\nexfe\Desktop\Trading\01-SignalForge-XAUUSD\runtime\live-dashboard.json`

This browser-safe workspace file is a direct NTFS hard link to MT5's Common
Files feed. SignalForge Monitor updates it in place, so no background mirror
process is required.

The browser receives heartbeat, account mode, balance/equity, broker prices,
open SignalForge position/risk, daily performance, and recent candles. With
v1.40 attached, schema 4 also includes the EA's exact 5 base checks, 6 regime
filters, next H1 close, auto-trading state, and phone-push health. The dashboard
shows these in the Trade Readiness Center alongside Setup Watch, Trend Radar,
Support/Resistance Map, and Exit Coach. The connection is read-only and cannot
place or modify orders.

The News Risk Guard reads MT5's native high-impact USD calendar in advisory
mode. It shows the next event and warning window and can send a phone advisory,
but it does not alter trading decisions or orders.

## v1.40 dashboard monitoring improvements

The dashboard now adds monitoring/validation improvements without changing the
v1.40 trade-entry rules. It adds:

- WhatsApp relay diagnostics with clearer failure hints.
- Manual XAUUSD trade warnings.
- A 30-day validation purity tracker.
- A daily operating report.
- A local “Why no trade?” blocked-setup log.
- Clearer decision wording for the current BUY/SELL/WAIT state.
- Safer separation between SignalForge auto trades and manual account exposure.

If manual XAUUSD positions are open, SignalForge can still monitor the account,
but the auto-trade validation should be treated as contaminated until those
manual trades are closed. For a clean 30-day validation, leave parameters
unchanged, keep MT5 and the WhatsApp relay running, and avoid manual trades on
the same FTMO demo account.
