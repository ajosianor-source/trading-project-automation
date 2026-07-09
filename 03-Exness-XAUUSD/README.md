# Exness Guard: Gold + Bitcoin

An independent MetaTrader 5 Expert Advisor for Exness XAUUSD and BTCUSD. It is
separate from projects `01` and `02`.

Current build: **v1.32**. See `docs/VALIDATION.md` before enabling any live
execution. The current decision is signals-only forward observation: XAUUSDm
is the stronger candidate, while BTCUSDm remains borderline.

## What it does

- Evaluates signals only when an H1 candle closes.
- Requires H1 EMA trend and slope, H4 EMA trend, RSI momentum, ADX/DI strength,
  and a breakout of the previous 20 completed H1 candles.
- Places an ATR-based stop at 1.5 ATR and target at 3 ATR.
- Sizes each position to risk no more than 0.02% of current equity.
- Allows only one Guard-family position across XAUUSD and BTCUSD at a time.
- Blocks excessive spread, rollover-hour entries, more than five entries per
  broker day, a 0.15% daily equity loss, and a 1% persistent equity drawdown.
- Refuses to round volume up when the broker minimum lot would exceed the
  requested risk.
- Persists its daily baseline, equity peak, and processed candle across MT5
  restarts to prevent safety resets and duplicate restart entries.
- Rejects stale prices, oversized volume, excessive projected margin, low
  post-trade free margin, and unverified order results or protective levels.
- Retries missing SL/TP protection after a fill and emergency-closes the
  position if that protection still cannot be confirmed.
- Accepts Exness symbol suffixes because it runs on the attached instrument
  chart.
- Paper-tracks qualified signals in signals-only mode using virtual entry,
  SL, TP, MFE/MAE, R-multiple, win rate, profit factor and drawdown statistics
  that persist across MT5 restarts.
- Measures requested-price versus fill-price slippage for EA-managed live
  orders, if live execution is later unlocked.

## Instrument profiles

The same compiled `ExnessGoldGuard.ex5` engine supports two isolated presets:

- `mt5/ExnessGoldGuard_002.set`: XAUUSD, magic `26070103`, maximum five entries
  per day, dashboard feed `live.json`.
- `mt5/ExnessBitcoinGuard_002.set`: BTCUSD, magic `26070104`, maximum three
  entries per day, dashboard feed `btc-live.json`.

Two additional files are live-account templates:

- `mt5/ExnessGoldGuard_LIVE_ENTER_ACCOUNT.set`
- `mt5/ExnessBitcoinGuard_LIVE_ENTER_ACCOUNT.set`

They enable the live switches and confirmation phrase but deliberately leave
`InpAuthorizedAccount = 0`. After loading a live template, replace zero in the
EA Inputs window with the exact MT5 login shown in the Exness terminal. Do not
put an account password in any EA input or file.

Execution values are taken from the connected Exness terminal at runtime:
symbol suffix, contract/tick value, volume minimum/maximum/step, stop level,
filling mode, current spread, free margin, and calculated order margin. The EA
rejects a trade if those live values violate its risk controls.

The BTC profile uses a 24-bar breakout, ADX 25, 2 ATR stop and 4 ATR target.
These are conservative research defaults, not validated performance claims.
Do not load the gold preset on BTCUSD or the BTC preset on XAUUSD.

Exness-specific spread normalization is 500 points ($0.50) for XAUUSDm and
5,000 points ($50) for BTCUSDm, with the stricter ATR-relative spread limits
still applied. These values were verified against Exness tester quotes.

The setup is designed for controlled testing. It does not promise a particular
win rate or profit.

## Alert system

Version 1.30 separates information from executable signals:

- `TREND`: aligned H1/H4 direction changed; no trade instruction.
- `WATCH`: four of five entry checks pass; explicitly no trade yet.
- `TRADE`: all five checks pass on a completed H1 candle.
- `RISK`: a confirmed setup was blocked by account, spread, margin, news or
  another safety control.
- `FILL`, `PROFIT`, and `EXIT`: server fill, 0.5R/1R/1.5R floating-profit
  milestones, and final closed P/L.

Alerts can appear in MT5, MetaTrader mobile push notifications, WhatsApp, and
the dashboard. A `PROFIT` alert reports current open profit; it does not predict
that the position will ultimately close profitably and it does not
automatically exit the trade.

Every H1 evaluation and lifecycle event is also appended to a persistent CSV
activity journal. See `docs/ACTIVITY-JOURNAL.md` for its location, schema and
forward-review process.

### MT5 mobile push

1. In the MetaTrader mobile app, copy the MetaQuotes ID from **Messages**.
2. In desktop MT5, open **Tools > Options > Notifications**.
3. Enable notifications, enter the MetaQuotes ID, and send the built-in test.
4. Keep `InpEnablePush = true`.

### WhatsApp relay

The EA uses the existing local relay under
`01-SignalForge-XAUUSD/tools/whatsapp-relay`.

1. Start `Start-WhatsAppRelay.cmd`.
2. In MT5 open **Tools > Options > Expert Advisors**.
3. Enable WebRequest for `http://127.0.0.1:8787`.
4. Run `Test-WhatsAppRelay.cmd`.
5. Keep `InpEnableWhatsApp = true`.

Twilio credentials stay in the relay `.env` and must never be entered into the
EA. WhatsApp Sandbox session and template restrictions still apply.

### USD news guard

The EA reads MT5's native economic calendar using broker-server time. New
entries are blocked from 30 minutes before until 15 minutes after a
high-impact USD event. Existing positions remain protected by their original
SL/TP and are not automatically closed. Live execution also fails closed when
the calendar is unavailable. The Strategy Tester disables the calendar guard,
so event-window behavior must be forward-tested separately.

## Live dashboard

Open `dashboard/index.html` in current Microsoft Edge or Google Chrome. The
dashboard opens with safe preview data and cannot place, close, or modify
orders.

When the EA is attached, it updates this read-only file every two seconds:

Gold:
`%APPDATA%\MetaQuotes\Terminal\Common\Files\ExnessGoldGuard\live.json`

Bitcoin:
`%APPDATA%\MetaQuotes\Terminal\Common\Files\ExnessGoldGuard\btc-live.json`

Click **Connect MT5 live file**, browse to that file, and approve read access.
The dashboard then shows:

- MT5 heartbeat, Exness verification, Algo Trading state, and execution lock;
- balance, equity, free margin, and margin level;
- current signal, bid/ask spread, and recent H1 candles;
- trend direction, five-check BUY/SELL progress, latest alert delivery, and
  USD news-window state;
- a live countdown to the next H1 evaluation and each individual signal
  factor;
- persistent shadow-trade results based on the configured reference equity,
  plus real-fill slippage analytics when fills exist;
- per-trade risk, daily loss, persistent drawdown, and trades used today;
- the Gold Guard position, floating P/L, and SL/TP protection status.

The EA must remain running for the heartbeat and feed to update. If the file is
not present, check the MT5 **Experts** log for the exact exported path and
confirm `InpExportDashboard = true`.

## Independent watchdog

Run `Start-ExnessGuard-Watchdog.cmd` after MT5 and the WhatsApp relay. It checks
the feed heartbeat and relay every ten seconds, writes a deduplicated health
log, and sends one stale-feed warning and one recovery alert. See
`docs/WATCHDOG.md`.

The watchdog and shadow tracker are monitoring tools. They do not make the
strategy certain, guarantee profitable trades, or bypass the live-account
locks. Version 1.32 remains the public build label for this upgrade.

## Install

1. In Exness MT5, choose **File > Open Data Folder**.
2. Copy `mt5/ExnessGoldGuard.mq5` into `MQL5/Experts`.
3. Open it in MetaEditor and press **F7**.
4. In MT5, refresh **Navigator > Expert Advisors**.
5. Open the Exness XAUUSD or BTCUSD H1 chart and attach **ExnessGoldGuard**.
6. Load the matching gold or bitcoin `.set` file.

The EA starts in signals-only mode:

- `InpEnableTrading = false`
- `InpConfirmLiveAccount = false`
- `InpAuthorizedAccount = 0`
- `InpLiveConfirmation` is blank

For demo automation, set only `InpEnableTrading = true`. For a live account,
set both switches to true, enter the exact MT5 login in
`InpAuthorizedAccount`, and enter `I_ACCEPT_LIVE_RISK` in
`InpLiveConfirmation`. Keep these locks closed until the validation gates below
have passed. The account lock prevents the preset from trading if it is
accidentally loaded on a different live login.

## Required validation

Run MT5 Strategy Tester using the Exness account and its exact XAUUSD symbol:

- Model: **Every tick based on real ticks**
- Timeframe: **H1**
- Period: at least January 2020 through the latest complete month
- Forward test: reserve the most recent 30% of the data
- Execution delay: random
- Deposit and leverage: match the intended account

Reject the robot if either the full period or untouched forward period is
unprofitable, if profit factor is below 1.20, or if equity drawdown exceeds 10%.
Then run it unchanged on an Exness demo account for at least 30 days before
considering live execution.

Repeat that entire validation independently for BTCUSD with the bitcoin preset.
BTCUSD is generally available 24/7 apart from server maintenance, so the test
must include weekends and realistic spread/commission conditions. A successful
XAUUSD test says nothing about BTCUSD performance.

## Accuracy

MT5's “99%/100% history quality” describes the tick data used by the test. It
does not mean the robot predicts 99% of trades correctly. Win rate must be
measured from honest out-of-sample and forward results.
