const PAIRS = {
  XAUUSD: { label: "XAU / USD", seed: 2330, decimals: 2, volatility: 7.5, status: "Validation conflict" },
  USDJPY: { label: "USD / JPY", seed: 161.2, decimals: 3, volatility: 0.36, status: "Needs new model" }
};

const state = {
  active: "XAUUSD",
  mode: "SIMULATED DATA",
  datasets: {},
  liveHandle: null,
  liveTimer: null,
  liveData: null,
  liveFailures: 0,
  liveFileName: null,
  liveFileModifiedUnix: null,
  blockedLog: JSON.parse(localStorage.getItem("signalforge-blocked-log") || "[]")
};

function saveBlockedLog() {
  localStorage.setItem("signalforge-blocked-log", JSON.stringify(state.blockedLog.slice(0, 80)));
}

function statusClass(ok, warn = false) {
  return ok ? "ok" : warn ? "warn" : "bad";
}

function $(selector) {
  return document.querySelector(selector);
}

function setText(selector, value) {
  const node = $(selector);
  if (node) node.textContent = value;
}

function setHTML(selector, value) {
  const node = $(selector);
  if (node) node.innerHTML = value;
}

function setClass(selector, className) {
  const node = $(selector);
  if (node) node.className = className;
}

function setStyle(selector, property, value) {
  const node = $(selector);
  if (node && node.style) node.style[property] = value;
}

function strategyBias(strategy) {
  if (!strategy) return "BUY";
  if (strategy.side === "BUY" || strategy.side === "SELL") return strategy.side;
  return Number(strategy.base?.sell || 0) > Number(strategy.base?.buy || 0) ? "SELL" : "BUY";
}

function missingRuleNames(items = {}, bias = "BUY") {
  const key = bias.toLowerCase();
  return Object.entries(items)
    .filter(([, values]) => !Boolean(values?.[key]))
    .map(([name]) => name);
}

function whatsAppDiagnostic(whatsApp = {}) {
  const relay = whatsApp.relayStatus || "NOT CHECKED";
  const error = Number(whatsApp.error || whatsApp.relayError || 0);
  if (relay === "READY" && whatsApp.status !== "FAILED") return "Relay ready";
  if (error === 401 || error === 403) return "Twilio credentials or sandbox permission problem";
  if (error === 1001 || relay === "ERROR") return "MT5 WebRequest/relay error. Check allowed URL and relay window";
  if (relay === "OFFLINE") return "Start START-WHATSAPP-RELAY.cmd";
  if (relay === "NOT CHECKED") return "Waiting for relay health check";
  return `${relay}${error ? ` · error ${error}` : ""}`;
}

function money(value, currency = "USD") {
  return `${currency} ${Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}

function setConnectionState(label, status) {
  setText("#dataMode", label);
  const pulse = document.querySelector(".pulse");
  if (pulse) pulse.className = `pulse ${status || ""}`.trim();
}

function openHandleDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("SignalForgeDashboard", 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains("handles")) {
        request.result.createObjectStore("handles");
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function saveLiveHandle(handle) {
  const database = await openHandleDatabase();
  await new Promise((resolve, reject) => {
    const transaction = database.transaction("handles", "readwrite");
    transaction.objectStore("handles").put(handle, "mt5-live");
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error);
  });
  database.close();
}

async function loadLiveHandle() {
  const database = await openHandleDatabase();
  const handle = await new Promise((resolve, reject) => {
    const request = database.transaction("handles", "readonly")
      .objectStore("handles").get("mt5-live");
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
  database.close();
  return handle;
}

function validateLivePayload(data) {
  if (!data || typeof data !== "object") return "Live file JSON is invalid.";
  if (!Array.isArray(data.candles) || data.candles.length === 0) return "Live file contains no candle data.";
  if (!data.market || !Number.isFinite(Number(data.market.bid)) || !Number.isFinite(Number(data.market.ask))) return "Live file is missing market bid/ask values.";
  if (data.market.spread == null || Number.isNaN(Number(data.market.spread))) return "Live file is missing market spread.";
  if (!data.account || !data.account.mode) return "Live file is missing account details.";
  if (!data.heartbeat && !data.heartbeatUnix) return "Live file is missing a heartbeat timestamp.";
  return null;
}

async function beginLiveUpdates(handle) {
  state.liveHandle = handle;
  state.liveFileName = handle.name;
  clearInterval(state.liveTimer);
  await refreshLive();
  state.liveTimer = setInterval(refreshLive, 2000);
  document.querySelector("#connectLive").textContent = "Reconnect MT5 file";
}

async function restoreLiveConnection() {
  if (!window.showOpenFilePicker || !window.indexedDB) return;
  try {
    const handle = await loadLiveHandle();
    if (!handle) return;
    state.liveHandle = handle;
    state.liveFileName = handle.name;
    const permission = await handle.queryPermission({ mode: "read" });
    if (permission !== "granted") {
      const requested = await handle.requestPermission?.({ mode: "read" });
      if (requested === "granted") {
        await beginLiveUpdates(handle);
        return;
      }
      setText("#connectLive", "Resume MT5 connection");
      setConnectionState("MT5 PERMISSION NEEDED", "stale");
      setText("#noticeTitle", "MT5 file permission needed.");
      setText("#noticeText", "Click Resume MT5 connection and allow browser access to the live JSON file.");
      return;
    }
    await beginLiveUpdates(handle);
  } catch (error) {
    console.warn("SignalForge could not restore the live file handle.", error);
  }
}

function renderLiveFactors(data) {
  const strategy = data.strategy;
  const biasKey = strategy
    ? (strategy.side === "SELL" || (strategy.side === "WAIT" && strategy.base?.sell > strategy.base?.buy) ? "sell" : "buy")
    : null;
  const factors = strategy && strategy.base?.items
    ? Object.entries(strategy.base.items).map(([name, values]) => [name, values[biasKey]])
    : [
        ["H1 trend", data.signal?.factors?.trend],
        ["RSI momentum", data.signal?.factors?.momentum],
        ["ADX direction", data.signal?.factors?.strength],
        ["H4 regime", data.signal?.factors?.higherTimeframe],
        ["20-bar breakout", data.signal?.factors?.breakout]
      ];
  const list = $("#factorList");
  if (!list) return;
  list.innerHTML = factors.map(([name, passed]) => `
    <div class="factor">
      <span class="factor-name">${name}</span>
      <span class="factor-track"><i style="width:${passed ? 100 : 18}%;background:${passed ? "var(--acid)" : "var(--red)"}"></i></span>
      <span class="factor-value">${passed ? "PASS" : "WAIT"}</span>
    </div>`).join("");
}

function renderChartFeedMeta(data, candles) {
  const meta = document.querySelector("#chartFeedMeta");
  if (!meta) return;
  const latest = candles?.at?.(-1);
  if (!data || !latest) {
    meta.textContent = "Waiting for MT5 candle feed.";
    return;
  }
  const market = data.market || {};
  const timeframe = data.timeframe || data.strategy?.timeframe || "H1";
  meta.innerHTML = `
    <span>Symbol <strong>${market.symbol || "XAUUSD"}</strong></span>
    <span>TF <strong>${timeframe}</strong></span>
    <span>Candle <strong>${latest.time || "—"}</strong></span>
    <span>O/H/L/C <strong>${Number(latest.open).toFixed(2)} / ${Number(latest.high).toFixed(2)} / ${Number(latest.low).toFixed(2)} / ${Number(latest.close).toFixed(2)}</strong></span>
    <span>Bid/Ask <strong>${Number(market.bid || latest.close).toFixed(2)} / ${Number(market.ask || latest.close).toFixed(2)}</strong></span>
  `;
}

function riskCard(label, value, limit, suffix = "%") {
  const ratio = limit > 0 ? Math.min(100, value / limit * 100) : 0;
  const severity = ratio >= 100 ? "bad" : ratio >= 70 ? "warn" : "";
  return `<div class="risk-item">
    <div><span>${label}</span><strong>${value.toFixed(2)}${suffix} / ${limit.toFixed(2)}${suffix}</strong></div>
    <div class="meter"><i class="${severity}" style="width:${ratio}%"></i></div>
  </div>`;
}

function renderRisk(data) {
  const risk = data.risk;
  setText("#riskStatus", risk.status);
  setClass("#riskStatus", `status-pill ${risk.status === "OK" ? "ok" : "bad"}`);
  setHTML("#riskGrid",
    riskCard("Daily loss", risk.dailyLossPercent, risk.dailyLossLimit) +
    riskCard("Account drawdown", risk.drawdownPercent, risk.drawdownLimit) +
    riskCard("Consecutive losses", risk.consecutiveLosses, risk.consecutiveLossLimit, "") +
    riskCard("Trades today", risk.tradesToday, risk.tradesLimit, "") +
    `<div class="risk-item"><div><span>SignalForge open risk</span><strong>${money(risk.signalforgeRisk, data.account.currency)}</strong></div></div>` +
    `<div class="risk-item"><div><span>Account floating P/L</span><strong>${money(risk.floatingProfit, data.account.currency)}</strong></div></div>`);
}

function renderHealth(data, heartbeatAge) {
  if (!$("#healthStatus") || !$("#healthList")) return;
  const checks = [
    ["MT5 connection", data.terminal.connected, data.terminal.connected ? "Connected" : "Disconnected"],
    ["Heartbeat", heartbeatAge <= 10, `${heartbeatAge}s old`],
    ["Algo Trading", data.terminal.algoTrading, data.terminal.algoTrading ? "Enabled" : "Disabled"],
    ["Account mode", data.account.mode === "DEMO", data.account.mode],
    ["Risk limits", data.risk.status === "OK", data.risk.status],
    ["SignalForge stops", !data.positions.some(p => p.owner === "SignalForge" && !p.stop), "Protected"]
  ];
  const failures = checks.filter(([, ok]) => !ok).length;
  setText("#healthStatus", failures ? `${failures} WARNING${failures > 1 ? "S" : ""}` : "HEALTHY");
  setClass("#healthStatus", `status-pill ${failures ? "bad" : "ok"}`);
  setHTML("#healthList", checks.map(([name, ok, value]) => `
    <div class="health-row"><span>${name}</span><strong class="${ok ? "ok" : "bad"}">${value}</strong></div>
  `).join(""));
}

function renderExitCoach(data) {
  if (!$("#exitStatus")) return;
  const coach = data.exitCoach || {
    status: "NO POSITION",
    action: "HOLD",
    pressure: 0,
    summary: "No SignalForge position open.",
    rMultiple: null,
    suggestedStop: null,
    barsOpen: null,
    reasons: ["Exit guidance appears after a SignalForge position opens."]
  };
  setText("#exitStatus", coach.status || "UNKNOWN");
  setClass("#exitStatus", `status-pill ${coach.status === "OK" || coach.status === "NO POSITION" ? "ok" : coach.status === "WATCH" ? "warn" : "bad"}`);
  setText("#exitAction", coach.action || "HOLD");
  setClass("#exitAction", `exit-action ${String(coach.action || "HOLD").toLowerCase().replace(/\s+/g, "-")}`);
  setText("#exitPressure", `${Number(coach.pressure || 0)} / 100`);
  setStyle("#exitPressureBar", "width", `${Math.min(100, Math.max(0, Number(coach.pressure || 0)))}%`);
  setClass("#exitPressureBar", Number(coach.pressure || 0) >= 70 ? "bad" : Number(coach.pressure || 0) >= 35 ? "warn" : "");
  setText("#exitSummary", coach.summary || "Waiting for live position data.");
  setText("#exitR", Number.isFinite(coach.rMultiple) ? `${coach.rMultiple.toFixed(2)} R` : "—");
  setText("#exitTrail", Number.isFinite(coach.suggestedStop) && coach.suggestedStop > 0 ? coach.suggestedStop.toFixed(2) : "—");
  setText("#exitBars", Number.isFinite(coach.barsOpen) ? coach.barsOpen : "—");
  setHTML("#exitReasons", Array.isArray(coach.reasons) && coach.reasons.length
    ? coach.reasons.map(reason => `<div>${reason}</div>`).join("")
    : "<div>No exit pressure detected.</div>");
}

function parseFilterCounts(reason = "") {
  const match = String(reason).match(/(\d+)\/5 bullish,\s*(\d+)\/5 bearish/i);
  if (!match) return null;
  return { bullish: Number(match[1]), bearish: Number(match[2]) };
}

function renderSetupWatch(data) {
  if (!$("#watchAction")) return;
  const strategy = data.strategy;
  const strategyBias = strategy
    ? (strategy.side === "SELL" || (strategy.side === "WAIT" && strategy.base.sell > strategy.base.buy) ? "SELL" : "BUY")
    : null;
  const factors = data.signal?.factors || {};
  const named = strategy
    ? Object.entries(strategy.base.items).map(([name, values]) => [name, values[strategyBias.toLowerCase()]])
    : [
        ["H1 trend", factors.trend],
        ["RSI momentum", factors.momentum],
        ["ADX direction", factors.strength],
        ["H4 regime", factors.higherTimeframe],
        ["20-bar breakout", factors.breakout]
      ];
  const passed = named.filter(([, ok]) => ok).length;
  const missing = named.filter(([, ok]) => !ok).map(([name]) => name);
  const counts = parseFilterCounts(data.signal?.reason);
  const signalSide = strategy?.side || data.signal?.side || "WAIT";
  const bias = strategyBias || (signalSide !== "WAIT"
    ? signalSide
    : counts
      ? counts.bullish >= counts.bearish ? "BUY" : "SELL"
      : "UNKNOWN");
  const bestCount = strategy ? Math.max(strategy.base.buy, strategy.base.sell) : counts ? Math.max(counts.bullish, counts.bearish) : passed;
  const readiness = signalSide !== "WAIT"
    ? "CONFIRMED"
    : bestCount >= 4
      ? "VERY CLOSE"
      : bestCount >= 3
        ? "FORMING"
        : "EARLY";
  const actionText = signalSide !== "WAIT"
    ? signalSide
    : readiness === "VERY CLOSE"
      ? `WATCH ${bias}`
      : readiness === "FORMING"
        ? `${bias} FORMING`
        : "WAIT";
  const statusText = signalSide !== "WAIT" ? "READY" : readiness === "VERY CLOSE" ? "WATCH" : readiness;
  const percent = Math.round(Math.min(100, bestCount / 5 * 100));
  const action = $("#watchAction");
  action.textContent = actionText;
  action.className = `watch-action ${bias.toLowerCase()} ${signalSide === "WAIT" ? "wait" : "ready"}`;
  const status = $("#watchStatus");
  status.textContent = statusText;
  status.className = `status-pill ${statusText === "READY" ? "ok" : statusText === "WATCH" || statusText === "VERY CLOSE" ? "warn" : ""}`;
  setText("#watchScore", `${bestCount} / 5`);
  setText("#watchSummary", signalSide !== "WAIT"
    ? `${signalSide} confirmed. Check entry, stop, target, spread, and risk.`
    : bestCount >= 4
      ? `${bias} is close. Wait for the missing filter before entry.`
      : bestCount >= 3
        ? `${bias} setup is forming, but not ready yet.`
        : "No high-quality setup forming yet.");
  const bar = $("#watchBar");
  if (bar) {
    bar.style.width = `${percent}%`;
    bar.className = percent >= 80 ? "warn" : percent >= 60 ? "" : "bad";
  }
  setText("#watchBias", bias);
  setText("#watchReadiness", readiness);
  setText("#watchTrigger", signalSide !== "WAIT"
    ? "Manage risk"
    : missing[0] || "Confirmed");
  setHTML("#missingFilters", missing.length
    ? missing.map(name => `<div><span>${name}</span><strong>Missing</strong></div>`).join("")
    : "<div><span>All filters</span><strong>Passed</strong></div>");
}

function clamp(value, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value));
}

function signedSlope(values, lookback = 5) {
  if (!values.length) return 0;
  const last = values.length - 1;
  const previous = Math.max(0, last - lookback);
  return Number(values[last] || 0) - Number(values[previous] || 0);
}

function candleBias(candle) {
  if (!candle) return 0;
  if (candle.close > candle.open) return 1;
  if (candle.close < candle.open) return -1;
  return 0;
}

function average(values) {
  const numeric = values.filter(Number.isFinite);
  if (!numeric.length) return 0;
  return numeric.reduce((sum, value) => sum + value, 0) / numeric.length;
}

function analyzeTrend(data) {
  const candles = Array.isArray(data.candles) ? data.candles : [];
  if (candles.length < 12) {
    return {
      direction: "RANGE",
      status: "WAIT",
      strength: 0,
      reversalRisk: 0,
      summary: "Waiting for enough live candles.",
      clues: ["Trend Radar needs at least 12 closed candles."]
    };
  }
  const last = candles[candles.length - 1];
  const previous = candles[candles.length - 2];
  const fast = candles.map(c => Number(c.fast)).filter(Number.isFinite);
  const slow = candles.map(c => Number(c.slow)).filter(Number.isFinite);
  const fastLast = fast[fast.length - 1];
  const slowLast = slow[slow.length - 1];
  const fastSlope = signedSlope(fast, 5);
  const slowSlope = signedSlope(slow, 5);
  const atr = Number(data.signal?.atr || 0);
  const rsi = Number(data.signal?.rsi || 50);
  const adx = Number(data.signal?.adx || 0);
  const separation = atr > 0 ? Math.abs(fastLast - slowLast) / atr : 0;
  const aboveFast = last.close > fastLast;
  const aboveSlow = last.close > slowLast;
  const bullishStructure = fastLast > slowLast && aboveFast && fastSlope > 0;
  const bearishStructure = fastLast < slowLast && !aboveFast && fastSlope < 0;
  const direction = bullishStructure ? "BULLISH" : bearishStructure ? "BEARISH" : "RANGE";
  const dir = direction === "BULLISH" ? 1 : direction === "BEARISH" ? -1 : 0;
  const h4Aligned = Boolean(data.signal?.factors?.higherTimeframe);
  const structureScore = direction === "RANGE" ? 20 : 35;
  const slopeScore = dir === 1 ? (fastSlope > 0 ? 15 : 0) + (slowSlope > 0 ? 10 : 0)
    : dir === -1 ? (fastSlope < 0 ? 15 : 0) + (slowSlope < 0 ? 10 : 0)
    : 0;
  const momentumScore = dir === 1 ? (rsi >= 52 ? 15 : 0) : dir === -1 ? (rsi <= 48 ? 15 : 0) : 5;
  const adxScore = adx >= 22 ? 15 : adx >= 18 ? 8 : 0;
  const separationScore = clamp(separation * 15, 0, 15);
  const h4Score = h4Aligned ? 10 : 0;
  const strength = Math.round(clamp(structureScore + slopeScore + momentumScore + adxScore + separationScore + h4Score));

  let reversalRisk = 0;
  const clues = [];
  if (direction === "RANGE") {
    reversalRisk = 45;
    clues.push("EMA structure is mixed; market is range/transition.");
  } else {
    const againstCandle = candleBias(last) === -dir;
    const priorAgainst = candleBias(previous) === -dir;
    const lostFast = dir === 1 ? last.close < fastLast : last.close > fastLast;
    const lostSlow = dir === 1 ? last.close < slowLast : last.close > slowLast;
    const momentumLost = dir === 1 ? rsi < 50 : rsi > 50;
    const slopeTurning = dir === 1 ? fastSlope <= 0 : fastSlope >= 0;
    if (lostFast) { reversalRisk += 25; clues.push("Price has crossed back through EMA 20."); }
    if (lostSlow) { reversalRisk += 30; clues.push("Price has crossed EMA 50; trend structure is under pressure."); }
    if (momentumLost) { reversalRisk += 20; clues.push("RSI has moved against the active trend."); }
    if (slopeTurning) { reversalRisk += 15; clues.push("EMA 20 slope is flattening or turning."); }
    if (adx < 18) { reversalRisk += 12; clues.push("ADX is weak; trend follow-through is low."); }
    if (againstCandle && priorAgainst) { reversalRisk += 12; clues.push("Two latest candles closed against the trend."); }
    if (!h4Aligned) { reversalRisk += 10; clues.push("Higher-timeframe filter is not aligned."); }
  }
  if (!clues.length) clues.push("Trend remains structurally intact.");
  reversalRisk = Math.round(clamp(reversalRisk));
  const status = reversalRisk >= 70 ? "REVERSAL" : reversalRisk >= 40 ? "WATCH" : "STABLE";
  const summary = direction === "BULLISH"
    ? (status === "STABLE" ? "Bullish trend intact." : "Bullish trend is weakening; watch reversal clues.")
    : direction === "BEARISH"
      ? (status === "STABLE" ? "Bearish trend intact." : "Bearish trend is weakening; watch reversal clues.")
      : "No clean directional trend; wait for structure to resolve.";
  return { direction, status, strength, reversalRisk, summary, clues };
}

function renderTrendRadar(data) {
  if (!$("#trendStatus")) return;
  const radar = analyzeTrend(data);
  setText("#trendStatus", radar.status);
  setClass("#trendStatus", `status-pill ${radar.status === "STABLE" ? "ok" : radar.status === "WATCH" ? "warn" : "bad"}`);
  setText("#trendDirection", radar.direction);
  setClass("#trendDirection", `trend-direction ${radar.direction.toLowerCase()}`);
  setText("#trendStrength", `${radar.strength} / 100`);
  setStyle("#trendStrengthBar", "width", `${radar.strength}%`);
  setClass("#trendStrengthBar", radar.strength >= 65 ? "" : radar.strength >= 40 ? "warn" : "bad");
  setText("#trendSummary", radar.summary);
  setText("#reversalRisk", `${radar.reversalRisk} / 100`);
  setStyle("#reversalRiskBar", "width", `${radar.reversalRisk}%`);
  setClass("#reversalRiskBar", radar.reversalRisk >= 70 ? "bad" : radar.reversalRisk >= 40 ? "warn" : "");
  setHTML("#trendClues", radar.clues.map(clue => `<div>${clue}</div>`).join(""));
}

function analyzeSupportResistance(data) {
  const candles = Array.isArray(data.candles) ? data.candles : [];
  if (candles.length < 30) {
    return {
      status: "WAIT",
      zone: "RANGE",
      price: null,
      support: null,
      resistance: null,
      distanceText: "—",
      summary: "Waiting for enough candles.",
      clues: ["S/R Map needs at least 30 closed candles."]
    };
  }
  const recent = candles.slice(-60);
  const channel = candles.slice(-20);
  const last = candles[candles.length - 1];
  const price = Number(last.close);
  const atr = Number(data.signal?.atr || 0);
  const channelHigh = Math.max(...channel.map(c => Number(c.high)));
  const channelLow = Math.min(...channel.map(c => Number(c.low)));
  const swingHighs = [];
  const swingLows = [];
  for (let i = 2; i < recent.length - 2; i++) {
    const c = recent[i];
    if (c.high > recent[i - 1].high && c.high > recent[i - 2].high && c.high >= recent[i + 1].high && c.high >= recent[i + 2].high) {
      swingHighs.push(Number(c.high));
    }
    if (c.low < recent[i - 1].low && c.low < recent[i - 2].low && c.low <= recent[i + 1].low && c.low <= recent[i + 2].low) {
      swingLows.push(Number(c.low));
    }
  }
  const resistanceCandidates = swingHighs.filter(v => v >= price).concat([channelHigh]);
  const supportCandidates = swingLows.filter(v => v <= price).concat([channelLow]);
  const resistance = resistanceCandidates.length ? Math.min(...resistanceCandidates) : channelHigh;
  const support = supportCandidates.length ? Math.max(...supportCandidates) : channelLow;
  const distToResistance = resistance - price;
  const distToSupport = price - support;
  const atrDistanceResistance = atr > 0 ? distToResistance / atr : Infinity;
  const atrDistanceSupport = atr > 0 ? distToSupport / atr : Infinity;
  const nearResistance = atrDistanceResistance >= 0 && atrDistanceResistance <= 0.35;
  const nearSupport = atrDistanceSupport >= 0 && atrDistanceSupport <= 0.35;
  const breakoutUp = price > channelHigh;
  const breakoutDown = price < channelLow;
  let zone = "RANGE";
  let status = "OK";
  const clues = [];
  if (breakoutUp) {
    zone = "BREAKOUT UP";
    status = "WATCH";
    clues.push("Price is above the recent 20-bar resistance channel.");
  } else if (breakoutDown) {
    zone = "BREAKOUT DOWN";
    status = "WATCH";
    clues.push("Price is below the recent 20-bar support channel.");
  } else if (nearResistance) {
    zone = "NEAR RESIST";
    status = "WATCH";
    clues.push("Price is close to resistance; avoid chasing late BUY entries.");
  } else if (nearSupport) {
    zone = "NEAR SUPPORT";
    status = "WATCH";
    clues.push("Price is close to support; avoid chasing late SELL entries.");
  } else {
    clues.push("Price is trading between nearby support and resistance.");
  }
  if (data.signal?.side === "BUY" && nearResistance) {
    status = "BLOCK";
    clues.push("BUY signal would be close to resistance; wait for clean breakout or pullback.");
  }
  if (data.signal?.side === "SELL" && nearSupport) {
    status = "BLOCK";
    clues.push("SELL signal would be close to support; wait for clean breakdown or bounce failure.");
  }
  const nearest = Math.min(Math.abs(distToResistance), Math.abs(distToSupport));
  const nearestAtr = atr > 0 ? nearest / atr : null;
  const distanceText = nearestAtr == null ? "—" : `${nearestAtr.toFixed(2)} ATR`;
  const summary = zone === "RANGE"
    ? "Price is inside the current support/resistance range."
    : zone.includes("BREAKOUT")
      ? "Breakout zone: wait for confirmation or retest."
      : "Price is close to a key level; trade quality may depend on reaction.";
  return { status, zone, price, support, resistance, distanceText, summary, clues };
}

function analyzeSupportResistanceV2(data) {
  const candles = Array.isArray(data.candles) ? data.candles : [];
  const closed = candles
    .filter(candle => !candle.forming)
    .map(candle => ({
      ...candle,
      open: Number(candle.open),
      high: Number(candle.high),
      low: Number(candle.low),
      close: Number(candle.close)
    }))
    .filter(candle => [candle.open, candle.high, candle.low, candle.close].every(Number.isFinite));

  if (closed.length < 80) {
    return {
      status: "WAIT",
      zone: "RANGE",
      price: null,
      support: null,
      resistance: null,
      supportZone: null,
      resistanceZone: null,
      supportZones: [],
      resistanceZones: [],
      distanceText: "—",
      summary: "Waiting for enough confirmed candles.",
      clues: ["S/R Map needs at least 80 closed H1 candles. The forming candle is ignored to avoid repainting."]
    };
  }

  const recent = closed.slice(-180);
  const channel = closed.slice(-20);
  const last = closed.at(-1);
  const price = last.close;
  const atr = Number(data.signal?.atr || data.strategy?.metrics?.atr || 0);
  const atrSafe = Number.isFinite(atr) && atr > 0
    ? atr
    : Math.max(0.01, average(channel.map(candle => candle.high - candle.low)));
  const clusterSize = Math.max(0.01, atrSafe * 0.45);
  const touchBand = Math.max(0.01, atrSafe * 0.30);
  const channelHigh = Math.max(...channel.map(candle => candle.high));
  const channelLow = Math.min(...channel.map(candle => candle.low));
  const swingHighs = [];
  const swingLows = [];

  for (let i = 3; i < recent.length - 3; i++) {
    const candle = recent[i];
    const left = recent.slice(i - 3, i);
    const right = recent.slice(i + 1, i + 4);
    const confirmedHigh = left.every(item => candle.high >= item.high) && right.every(item => candle.high > item.high);
    const confirmedLow = left.every(item => candle.low <= item.low) && right.every(item => candle.low < item.low);
    if (confirmedHigh) swingHighs.push({ price: candle.high, index: i, type: "resistance" });
    if (confirmedLow) swingLows.push({ price: candle.low, index: i, type: "support" });
  }

  function cluster(points, type) {
    const zones = [];
    for (const point of [...points].sort((a, b) => a.price - b.price)) {
      let zone = zones.find(item => Math.abs(item.center - point.price) <= clusterSize);
      if (!zone) {
        zone = {
          type,
          prices: [],
          touches: 0,
          firstIndex: point.index,
          lastIndex: point.index,
          center: point.price,
          low: point.price,
          high: point.price,
          score: 0,
          broken: false,
          retest: false,
          distanceAtr: 0
        };
        zones.push(zone);
      }
      zone.prices.push(point.price);
      zone.touches += 1;
      zone.firstIndex = Math.min(zone.firstIndex, point.index);
      zone.lastIndex = Math.max(zone.lastIndex, point.index);
      zone.center = average(zone.prices);
      zone.low = Math.min(...zone.prices) - touchBand;
      zone.high = Math.max(...zone.prices) + touchBand;
    }

    return zones.map(zone => {
      const rejectionTouches = recent.filter(candle => {
        const inZone = type === "resistance"
          ? candle.high >= zone.low && candle.high <= zone.high
          : candle.low <= zone.high && candle.low >= zone.low;
        const rejected = type === "resistance"
          ? candle.close < zone.center
          : candle.close > zone.center;
        return inZone && rejected;
      }).length;
      const latestDistance = recent.length - 1 - zone.lastIndex;
      const recencyScore = clamp(30 - latestDistance / 3, 0, 30);
      const touchScore = clamp(zone.touches * 16, 0, 45);
      const rejectionScore = clamp(rejectionTouches * 6, 0, 25);
      const closeBuffer = type === "resistance" ? price - zone.high : zone.low - price;
      const broken = closeBuffer > touchBand;
      const retest = broken && Math.abs(price - (type === "resistance" ? zone.high : zone.low)) <= atrSafe * 0.65;
      return {
        ...zone,
        touches: rejectionTouches || zone.touches,
        score: Math.round(clamp(touchScore + rejectionScore + recencyScore, 0, 100)),
        broken,
        retest,
        distanceAtr: Math.abs(price - zone.center) / atrSafe
      };
    }).sort((a, b) => b.score - a.score);
  }

  const resistanceZones = cluster(swingHighs.concat([{ price: channelHigh, index: recent.length - 1, type: "resistance" }]), "resistance")
    .filter(zone => zone.high >= price - atrSafe)
    .sort((a, b) => Math.abs(a.center - price) - Math.abs(b.center - price))
    .slice(0, 3);
  const supportZones = cluster(swingLows.concat([{ price: channelLow, index: recent.length - 1, type: "support" }]), "support")
    .filter(zone => zone.low <= price + atrSafe)
    .sort((a, b) => Math.abs(a.center - price) - Math.abs(b.center - price))
    .slice(0, 3);

  const resistanceZone = resistanceZones.find(zone => zone.center >= price) || resistanceZones[0] || null;
  const supportZone = supportZones.find(zone => zone.center <= price) || supportZones[0] || null;
  const resistance = resistanceZone?.center ?? channelHigh;
  const support = supportZone?.center ?? channelLow;
  const distToResistance = resistanceZone ? Math.max(0, resistanceZone.low - price) : resistance - price;
  const distToSupport = supportZone ? Math.max(0, price - supportZone.high) : price - support;
  const nearResistance = Boolean(resistanceZone) && price <= resistanceZone.high && distToResistance / atrSafe <= 0.35;
  const nearSupport = Boolean(supportZone) && price >= supportZone.low && distToSupport / atrSafe <= 0.35;
  const breakoutUp = price > channelHigh + touchBand;
  const breakoutDown = price < channelLow - touchBand;
  const retestResistance = resistanceZone?.retest;
  const retestSupport = supportZone?.retest;
  let zone = "RANGE";
  let status = "OK";
  const clues = [];

  if (retestResistance) {
    zone = "RETEST R";
    status = "WATCH";
    clues.push("Price is retesting a broken resistance zone; wait for the retest candle to close.");
  } else if (retestSupport) {
    zone = "RETEST S";
    status = "WATCH";
    clues.push("Price is retesting a broken support zone; wait for the retest candle to close.");
  } else if (breakoutUp) {
    zone = "BREAKOUT UP";
    status = "WATCH";
    clues.push("Last closed candle is above the recent 20-bar resistance channel.");
  } else if (breakoutDown) {
    zone = "BREAKOUT DOWN";
    status = "WATCH";
    clues.push("Last closed candle is below the recent 20-bar support channel.");
  } else if (nearResistance) {
    zone = "NEAR RESIST";
    status = "WATCH";
    clues.push("Price is close to a confirmed resistance zone; avoid chasing late BUY entries.");
  } else if (nearSupport) {
    zone = "NEAR SUPPORT";
    status = "WATCH";
    clues.push("Price is close to a confirmed support zone; avoid chasing late SELL entries.");
  } else {
    clues.push("Price is trading between confirmed support and resistance zones.");
  }

  const intendedSide = data.strategy?.side || data.signal?.side;
  if (intendedSide === "BUY" && nearResistance) {
    status = "BLOCK";
    clues.push("BUY idea is too close to resistance; wait for a closed breakout or a clean pullback.");
  }
  if (intendedSide === "SELL" && nearSupport) {
    status = "BLOCK";
    clues.push("SELL idea is too close to support; wait for a closed breakdown or a failed bounce.");
  }

  const strongestR = resistanceZones[0];
  const strongestS = supportZones[0];
  if (strongestR) clues.push(`Strongest resistance: ${strongestR.low.toFixed(2)}–${strongestR.high.toFixed(2)} (${strongestR.score}/100, ${strongestR.touches} touches).`);
  if (strongestS) clues.push(`Strongest support: ${strongestS.low.toFixed(2)}–${strongestS.high.toFixed(2)} (${strongestS.score}/100, ${strongestS.touches} touches).`);
  clues.push("Non-repainting: zones use closed candles plus confirmed swing points only.");

  const nearest = Math.min(
    resistanceZone ? Math.abs(price - resistanceZone.center) : Infinity,
    supportZone ? Math.abs(price - supportZone.center) : Infinity
  );
  const nearestAtr = Number.isFinite(nearest) ? nearest / atrSafe : null;
  const distanceText = nearestAtr == null ? "—" : `${nearestAtr.toFixed(2)} ATR`;
  const summary = zone === "RANGE"
    ? "Price is inside the active support/resistance map."
    : zone.includes("BREAKOUT") || zone.includes("RETEST")
      ? "Breakout/retest area: wait for a closed candle confirmation."
      : "Price is near a confirmed level; trade quality depends on reaction.";

  return {
    status,
    zone,
    price,
    support,
    resistance,
    supportZone,
    resistanceZone,
    supportZones,
    resistanceZones,
    distanceText,
    summary,
    clues
  };
}

function renderSupportResistance(data) {
  if (!$("#srStatus")) return;
  const sr = analyzeSupportResistanceV2(data);
  setText("#srStatus", sr.status);
  setClass("#srStatus", `status-pill ${sr.status === "OK" ? "ok" : sr.status === "WATCH" ? "warn" : "bad"}`);
  setText("#srZone", sr.zone);
  setClass("#srZone", `sr-zone ${sr.status === "BLOCK" ? "block" : sr.zone.includes("BREAKOUT") ? "breakout" : sr.zone.includes("NEAR") ? "near" : "neutral"}`);
  setText("#srDistance", sr.distanceText);
  setText("#srSummary", sr.summary);
  setText("#srResistance", Number.isFinite(sr.resistance) ? sr.resistance.toFixed(2) : "—");
  setText("#srPrice", Number.isFinite(sr.price) ? sr.price.toFixed(2) : "—");
  setText("#srSupport", Number.isFinite(sr.support) ? sr.support.toFixed(2) : "—");
  setHTML("#srClues", sr.clues.map(clue => `<div>${clue}</div>`).join(""));
}

function renderSupportResistancePro(data) {
  if (!$("#srStatus")) return;
  const sr = analyzeSupportResistanceV2(data);
  setText("#srStatus", sr.status);
  setClass("#srStatus", `status-pill ${sr.status === "OK" ? "ok" : sr.status === "WATCH" ? "warn" : "bad"}`);
  setText("#srZone", sr.zone);
  setClass("#srZone", `sr-zone ${sr.status === "BLOCK" ? "block" : sr.zone.includes("BREAKOUT") || sr.zone.includes("RETEST") ? "breakout" : sr.zone.includes("NEAR") ? "near" : "neutral"}`);
  setText("#srDistance", sr.distanceText);
  setText("#srSummary", sr.summary);
  setText("#srResistance", sr.resistanceZone
    ? `${sr.resistanceZone.low.toFixed(2)}–${sr.resistanceZone.high.toFixed(2)}`
    : Number.isFinite(sr.resistance) ? sr.resistance.toFixed(2) : "—");
  setText("#srPrice", Number.isFinite(sr.price) ? sr.price.toFixed(2) : "—");
  setText("#srSupport", sr.supportZone
    ? `${sr.supportZone.low.toFixed(2)}–${sr.supportZone.high.toFixed(2)}`
    : Number.isFinite(sr.support) ? sr.support.toFixed(2) : "—");
  setHTML("#srClues", sr.clues.map(clue => `<div>${clue}</div>`).join(""));
}

function renderPositions(data) {
  if (!$("#positionSummary")) return;
  setText("#positionSummary", `${data.positions.length} open · ${money(data.risk.floatingProfit, data.account.currency)} floating`);
  setHTML("#positionsBody", data.positions.length
    ? data.positions.map(p => `<tr>
        <td>${p.owner}</td><td>${p.symbol}</td><td>${p.side}</td><td>${p.volume}</td>
        <td>${p.entry.toFixed(5)}</td><td>${p.stop ? p.stop.toFixed(5) : "UNPROTECTED"}</td>
        <td class="${p.profit >= 0 ? "positive" : "negative"}">${money(p.profit, data.account.currency)}</td>
        <td>${money(p.risk, data.account.currency)}</td>
      </tr>`).join("")
    : '<tr class="empty-row"><td colspan="8">No open account positions.</td></tr>');
}

function renderJournal(data) {
  if (!$("#journalSummary") || !$("#journalBody")) return;
  const entries = Array.isArray(data.history?.entries) ? [...data.history.entries].reverse() : [];
  const summary = data.performance || { trades: 0, wins: 0, netProfit: 0, maxDrawdown: 0 };
  const winRate = summary.trades ? summary.wins / summary.trades * 100 : 0;
  setText("#journalSummary", `${summary.trades} closed · ${winRate.toFixed(1)}% win rate`);
  setHTML("#journalBody", entries.length
    ? entries.map(entry => `<tr>
        <td>${new Date(entry.time * 1000).toLocaleString()}</td><td>${entry.event}</td>
        <td>${entry.symbol}</td><td>${entry.side}</td><td>${entry.volume}</td>
        <td>${entry.price.toFixed(5)}</td>
        <td class="${entry.pnl >= 0 ? "positive" : "negative"}">${money(entry.pnl, data.account.currency)}</td>
        <td>${entry.reason.replace("DEAL_REASON_", "")}</td>
      </tr>`).join("")
    : '<tr class="empty-row"><td colspan="8">No SignalForge trade history in the selected monitor period.</td></tr>');
  setText("#performanceSummary", `${money(summary.netProfit, data.account.currency)} net · ${money(summary.maxDrawdown, data.account.currency)} max DD`);
  drawEquityChart(data.history?.equity || []);
}

function countdownText(unixTime, referenceUnix = Math.floor(Date.now() / 1000)) {
  const remaining = Math.max(0, Number(unixTime || 0) - Number(referenceUnix || 0));
  const hours = Math.floor(remaining / 3600);
  const minutes = Math.floor((remaining % 3600) / 60);
  const seconds = remaining % 60;
  return hours > 0
    ? `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
    : `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function strategyCheckRows(items, biasKey) {
  return Object.entries(items || {}).map(([name, values]) => {
    const passed = Boolean(values?.[biasKey]);
    return `<div class="check-row"><span>${name}</span><strong class="${passed ? "pass" : "wait"}">${passed ? "PASS" : "WAIT"}</strong></div>`;
  }).join("");
}

function operationRow(label, value, state = "") {
  return `<div class="operation-row"><span>${label}</span><strong class="${state}">${value}</strong></div>`;
}

function renderStrategyCenter(data) {
  const strategy = data.strategy;
  const status = document.querySelector("#strategyStatus");
  if (!strategy) {
    status.textContent = "EA FEED WAITING";
    status.className = "status-pill warn";
    document.querySelector("#strategyAction").textContent = "WAIT";
    document.querySelector("#strategyAction").className = "readiness-action wait";
    document.querySelector("#strategyHeadline").textContent = "Waiting for the v1.40 strategy snapshot";
    document.querySelector("#strategyReason").textContent = "Reattach the updated v1.40 EA and SignalForge Monitor once.";
    document.querySelector("#strategyOperations").innerHTML = operationRow("EA strategy feed", "NOT RECEIVED", "warn");
    return;
  }

  const buyBase = Number(strategy.base?.buy || 0);
  const sellBase = Number(strategy.base?.sell || 0);
  const buyFilters = Number(strategy.filters?.buy || 0);
  const sellFilters = Number(strategy.filters?.sell || 0);
  const bias = strategy.side !== "WAIT" ? strategy.side : sellBase > buyBase ? "SELL" : "BUY";
  const biasKey = bias.toLowerCase();
  const bestBase = Math.max(buyBase, sellBase);
  const readiness = strategy.readiness || { ready: true, reason: "READY" };
  const dataReady = Boolean(readiness.ready);
  const confirmed = strategy.side === "BUY" || strategy.side === "SELL";
  const forming = dataReady && !confirmed && bestBase >= 4;
  const stateText = !dataReady ? "DATA WARMING" : confirmed ? "TRADE CONFIRMED" : forming ? "SETUP FORMING" : "WAITING";

  status.textContent = stateText;
  status.className = `status-pill ${!dataReady ? "warn" : confirmed ? "ok" : forming ? "warn" : ""}`;
  const action = document.querySelector("#strategyAction");
  action.textContent = !dataReady ? "BLOCKED" : confirmed ? strategy.side : forming ? `${bias} 4/5` : "WAIT";
  action.className = `readiness-action ${!dataReady ? "wait" : confirmed ? strategy.side.toLowerCase() : forming ? "forming" : "wait"}`;
  document.querySelector("#strategyHeadline").textContent = !dataReady
    ? "Indicator history is loading; orders are blocked"
    : confirmed
    ? `${strategy.side} is fully confirmed by v1.40`
    : forming
      ? `${bias} setup is close, but it is not a trade yet`
      : `No confirmed trade; strongest bias is ${bias}`;
  document.querySelector("#strategyReason").textContent = dataReady ? strategy.reason : readiness.reason;
  document.querySelector("#strategyCountdown").textContent =
    countdownText(strategy.nextCloseUnix, strategy.heartbeatUnix);
  document.querySelector("#strategyBuyBase").textContent = `${buyBase} / 5`;
  document.querySelector("#strategySellBase").textContent = `${sellBase} / 5`;
  document.querySelector("#strategyBuyFilters").textContent = `${buyFilters} / 6`;
  document.querySelector("#strategySellFilters").textContent = `${sellFilters} / 6`;
  document.querySelector("#strategyBias").textContent = `BIAS ${bias}`;
  document.querySelector("#strategyVersion").textContent = `v${strategy.version}`;
  document.querySelector("#strategyBaseChecks").innerHTML = strategyCheckRows(strategy.base?.items, biasKey);
  document.querySelector("#strategyFilterChecks").innerHTML = strategyCheckRows(strategy.filters?.items, biasKey);

  const automation = strategy.automation || {};
  const notification = strategy.notification || {};
  const whatsApp = notification.whatsApp || {};
  const autoState = automation.status === "ON" ? "ok" : automation.status === "OFF" ? "warn" : "bad";
  const phoneReady = notification.enabled && notification.configured;
  const phoneState = phoneReady ? "ok" : "bad";
  const phoneText = !notification.enabled ? "DISABLED" : !notification.configured ? "NOT CONFIGURED" : "READY";
  const lastPush = notification.lastTimeUnix
    ? `${notification.status} · ${new Date(notification.lastTimeUnix * 1000).toLocaleTimeString()}`
    : notification.status;
  const pushState = notification.status === "FAILED" || notification.status === "NOT CONFIGURED" ? "bad" :
    notification.status === "SENT" ? "ok" : "warn";
  const whatsAppStatus = whatsApp.status || "NOT SENT";
  const whatsAppText = whatsApp.lastTimeUnix
    ? `${whatsAppStatus} · ${new Date(whatsApp.lastTimeUnix * 1000).toLocaleTimeString()}`
    : whatsAppStatus;
  const whatsAppState = whatsAppStatus === "FAILED" ? "bad" :
    whatsAppStatus === "SENT" ? "ok" : "warn";
  const relayStatus = whatsApp.relayStatus || "NOT CHECKED";
  const relayState = relayStatus === "READY" ? "ok" :
    relayStatus === "DISABLED" || relayStatus === "NOT CHECKED" ? "warn" : "bad";
  const feedAge = Math.max(0, Number(data.heartbeatUnix || 0) - Number(strategy.heartbeatUnix || 0));
  document.querySelector("#strategyOperations").innerHTML =
    operationRow("Data readiness", dataReady ? "READY" : "ORDERS BLOCKED", dataReady ? "ok" : "bad") +
    operationRow("Auto demo trading", automation.status, autoState) +
    operationRow("4/5 phone alert", notification.nearSignalEnabled ? phoneText : "DISABLED", notification.nearSignalEnabled ? phoneState : "warn") +
    operationRow("Last phone push", lastPush || "NOT SENT", pushState) +
    operationRow("WhatsApp alerts", whatsApp.enabled ? "ENABLED" : "DISABLED", whatsApp.enabled ? "ok" : "warn") +
    operationRow("WhatsApp relay", relayStatus, relayState) +
    operationRow("Last WhatsApp", whatsAppText, whatsAppState) +
    operationRow("Risk per trade", `${Number(automation.riskPercent || 0).toFixed(2)}%`, "ok") +
    operationRow("EA strategy feed", `${feedAge}s old`, feedAge <= 15 ? "ok" : "bad");
}

function renderNewsGuard(data) {
  const strategy = data.strategy;
  const news = strategy?.news;
  setText("#newsStatus", news ? (!news.enabled ? "DISABLED" : !news.available ? "UNAVAILABLE" : news.status) : "EA FEED WAITING");
  setClass("#newsStatus", news ? `status-pill ${news.status === "CLEAR" ? "ok" : news.status === "EVENT SOON" || news.status === "POST-EVENT" ? "warn" : "bad"}` : "status-pill warn");
  setText("#newsAction", news ? (news.status === "EVENT SOON" ? "NEWS SOON" : news.status === "POST-EVENT" ? "CAUTION" : news.status === "CLEAR" ? "CLEAR" : news.status) : "WAIT");
  setClass("#newsAction", news ? `news-action ${news.status === "EVENT SOON" ? "soon" : news.status === "POST-EVENT" ? "post-event" : news.status === "CLEAR" ? "clear" : "unavailable"}` : "news-action unavailable");

  if (!news) {
    setText("#newsEvent", "Waiting for the updated v1.40 news feed");
    setText("#newsEventMeta", "Reattach the updated EA once.");
    setText("#newsCountdown", "--:--");
    return;
  }

  const hasEvent = Number(news.eventTimeUnix || 0) > 0 && Boolean(news.event);
  setText("#newsEvent", hasEvent
    ? news.event
    : news.status === "UNAVAILABLE"
      ? `MT5 calendar unavailable${news.error ? ` · error ${news.error}` : ""}`
      : "No high-impact USD event found in the next 24 hours");
  setText("#newsEventMeta", `${news.currency || "USD"} · ${news.importance || "HIGH"} impact · MT5 broker calendar`);
  setText("#newsCountdown", hasEvent
    ? Number(news.minutesTo) >= 0
      ? countdownText(news.eventTimeUnix, strategy.heartbeatUnix)
      : `${Math.abs(Number(news.minutesTo))}m ago`
    : "--:--");
  setText("#newsWindow", `${news.alertMinutes}m before · ${news.postEventMinutes}m after`);
}

function updateBlockedLog(data) {
  const strategy = data.strategy;
  if (!strategy || !strategy.readiness?.ready) return;
  const bias = strategyBias(strategy);
  const key = `${strategy.signalBarUnix || data.heartbeatUnix}-${bias}`;
  if (state.blockedLog.some(row => row.key === key)) return;
  if (strategy.side === "BUY" || strategy.side === "SELL") return;

  const baseMissing = missingRuleNames(strategy.base?.items, bias);
  const filterMissing = missingRuleNames(strategy.filters?.items, bias);
  const baseCount = Number(strategy.base?.[bias.toLowerCase()] || 0);
  const filterCount = Number(strategy.filters?.[bias.toLowerCase()] || 0);
  const shouldRecord = baseCount >= 3 || filterCount >= 4 || Math.max(Number(strategy.base?.buy || 0), Number(strategy.base?.sell || 0)) >= 3;
  if (!shouldRecord) return;

  state.blockedLog.unshift({
    key,
    time: strategy.signalBarUnix || data.heartbeatUnix,
    bias,
    base: `${baseCount}/5`,
    filters: `${filterCount}/6`,
    missing: [...baseMissing, ...filterMissing].slice(0, 6).join(", ") || "Rule alignment incomplete"
  });
  state.blockedLog = state.blockedLog.slice(0, 80);
  saveBlockedLog();
}

function renderBlockedLog(data) {
  if (!$("#blockedSummary") || !$("#blockedBody")) return;
  updateBlockedLog(data);
  const rows = state.blockedLog.slice(0, 10);
  setText("#blockedSummary", rows.length
    ? `${rows.length} recent blocked setups`
    : "No blocked setups recorded yet");
  setHTML("#blockedBody", rows.length
    ? rows.map(row => `<tr>
        <td>${new Date(row.time * 1000).toLocaleString()}</td>
        <td>${row.bias}</td>
        <td>${row.base}</td>
        <td>${row.filters}</td>
        <td>${row.missing}</td>
      </tr>`).join("")
    : '<tr class="empty-row"><td colspan="5">Connect live data and leave the dashboard open. Near setups will be logged here.</td></tr>');
}

function renderValidation(data, heartbeatAge) {
  if (!$("#validationStatus") || !$("#validationList")) return;
  const strategy = data.strategy || {};
  const automation = strategy.automation || {};
  const notification = strategy.notification || {};
  const whatsApp = notification.whatsApp || {};
  const manualPositions = (data.positions || []).filter(p => p.owner === "Manual" && p.symbol === data.market.symbol);
  const otherEaPositions = (data.positions || []).filter(p => p.owner === "Other EA");
  const stale = heartbeatAge > 10 || !data.terminal.connected;
  const relayOk = !whatsApp.enabled || whatsApp.relayStatus === "READY";

  const checks = [
    ["MT5 live feed", !stale, stale ? `${heartbeatAge}s old` : "Fresh"],
    ["Auto demo trading", automation.status === "ON", automation.status || "UNKNOWN"],
    ["Manual XAUUSD trades", manualPositions.length === 0, manualPositions.length ? `${manualPositions.length} manual open` : "None"],
    ["Other EA positions", otherEaPositions.length === 0, otherEaPositions.length ? `${otherEaPositions.length} open` : "None"],
    ["Push notification", notification.enabled && notification.configured, notification.configured ? notification.status : "Not configured"],
    ["WhatsApp relay", relayOk, whatsAppDiagnostic(whatsApp)],
    ["Risk limits", data.risk.status === "OK", data.risk.status],
    ["News guard", strategy.news?.status !== "UNAVAILABLE", strategy.news?.status || "WAITING"]
  ];
  const failures = checks.filter(([, ok]) => !ok);
  const warning = $("#validationWarning");
  const status = $("#validationStatus");
  setText("#validationStatus", failures.length ? `${failures.length} ISSUE${failures.length > 1 ? "S" : ""}` : "CLEAN");
  setClass("#validationStatus", `status-pill ${failures.length ? "warn" : "ok"}`);
  if (warning) {
    warning.classList.toggle("hidden", failures.length === 0);
    warning.classList.toggle("bad", manualPositions.length > 0);
    warning.textContent = manualPositions.length
      ? "Manual XAUUSD trades are open. SignalForge can still monitor, but the 30-day auto-trade validation is no longer clean until those manual positions are closed."
      : failures.length
        ? `Validation warning: ${failures.map(([name]) => name).join(", ")} needs attention.`
        : "";
  }
  setHTML("#validationList", checks.map(([name, ok, value]) => `
    <div class="health-row"><span>${name}</span><strong class="${ok ? "ok" : "bad"}">${value}</strong></div>
  `).join(""));
}

function renderDailyReport(data, heartbeatAge) {
  if (!$("#dailyStatus") || !$("#dailyReport")) return;
  const strategy = data.strategy || {};
  const notification = strategy.notification || {};
  const whatsApp = notification.whatsApp || {};
  const manualCount = (data.positions || []).filter(p => p.owner === "Manual").length;
  const autoOk = strategy.automation?.status === "ON";
  const alertOk = notification.configured && (!whatsApp.enabled || whatsApp.relayStatus === "READY");
  const riskOk = data.risk.status === "OK";
  const clean = manualCount === 0 && autoOk && alertOk && riskOk && heartbeatAge <= 10;
  setText("#dailyStatus", clean ? "GOOD" : "WATCH");
  setClass("#dailyStatus", `status-pill ${clean ? "ok" : "warn"}`);
  const bias = strategyBias(strategy);
  const base = Number(strategy.base?.[bias.toLowerCase()] || 0);
  const filters = Number(strategy.filters?.[bias.toLowerCase()] || 0);
  const missing = [
    ...missingRuleNames(strategy.base?.items, bias),
    ...missingRuleNames(strategy.filters?.items, bias)
  ];
  setHTML("#dailyReport", `
    <div><span>SignalForge trades</span><strong>${data.today.trades} today</strong><small>${money(data.today.realized, data.account.currency)} realized</small></div>
    <div><span>Current decision</span><strong>${strategy.side || data.signal?.side || "WAIT"} · ${bias} bias</strong><small>${base}/5 base · ${filters}/6 filters</small></div>
    <div><span>Why no trade</span><strong>${missing[0] || "No missing rule"}</strong><small>${missing.length ? missing.slice(0, 3).join(", ") : "Trade would require execution checks."}</small></div>
    <div><span>Account exposure</span><strong>${data.positions.length} open positions</strong><small>${manualCount} manual · ${money(data.risk.floatingProfit, data.account.currency)} floating</small></div>
    <div><span>Alert health</span><strong>Push ${notification.status || "WAITING"} · WhatsApp ${whatsApp.status || "WAITING"}</strong><small>${whatsAppDiagnostic(whatsApp)}</small></div>
    <div><span>System health</span><strong>${heartbeatAge}s feed · risk ${data.risk.status}</strong><small>${autoOk ? "Automation ON" : `Automation ${strategy.automation?.status || "unknown"}`}</small></div>
  `);
}

function renderExtendedLive(data, heartbeatAge) {
  const liveDetails = $("#liveDetails");
  if (!liveDetails) return;
  liveDetails.classList.remove("hidden");
  if ($("#strategyStatus")) renderStrategyCenter(data);
  if ($("#validationStatus")) renderValidation(data, heartbeatAge);
  if ($("#dailyStatus")) renderDailyReport(data, heartbeatAge);
  if ($("#blockedSummary")) renderBlockedLog(data);
  if ($("#srStatus")) renderSupportResistancePro(data);
  if ($("#riskStatus")) renderRisk(data);
  if ($("#healthStatus")) renderHealth(data, heartbeatAge);
  if ($("#positionSummary")) renderPositions(data);
  if ($("#journalSummary") && $("#journalBody")) renderJournal(data);
}

function normalizeLiveData(data) {
  const candles = [...(data.candles || [])]
    .sort((a, b) => String(a.time).localeCompare(String(b.time)))
    .map((candle, index, sorted) => ({
      ...candle,
      forming: index === sorted.length - 1
    }));
  return { ...data, candles };
}

function renderLive(data) {
  data = normalizeLiveData(data);
  state.liveData = data;
  state.active = "XAUUSD";
  const market = data.market || {};
  const account = data.account || { currency: "USD" };
  const position = data.position || {};
  const activeSignal = data.strategy || data.signal || { side: "WAIT", reason: "No signal data.", score: 0, entry: null, stop: null, target: null };
  const strategyBuyBase = Number(data.strategy?.base?.buy || 0);
  const strategySellBase = Number(data.strategy?.base?.sell || 0);
  const confirmedEntrySide = activeSignal.side === "BUY" || activeSignal.side === "SELL"
    ? activeSignal.side
    : null;
  const formingEntrySide = !confirmedEntrySide && data.strategy && Math.max(strategyBuyBase, strategySellBase) >= 4
    ? (strategySellBase > strategyBuyBase ? "SELL" : "BUY")
    : null;
  const heartbeatAge = Math.max(0, Math.floor(Date.now() / 1000 - Number(data._fileModifiedUnix || data.heartbeatUnix || 0)));
  const stale = heartbeatAge > 10 || !data.terminal?.connected;
  const manualPositions = (data.positions || []).filter(p => p.owner === "Manual" && p.symbol === market.symbol);
  setConnectionState(stale ? "MT5 STALE / OFFLINE" : `LIVE ${account.mode || "UNKNOWN"}`, stale ? "stale" : "live");

  setText("#liveFileInfo", state.liveFileName
    ? `${state.liveFileName} · ${new Date((state.liveFileModifiedUnix || data._fileModifiedUnix || 0) * 1000).toLocaleTimeString()}`
    : "—");

  setText("#noticeTitle", stale
    ? "Connection warning."
    : manualPositions.length
      ? "Validation warning."
      : "Read-only live mode.");
  setText("#noticeText", stale
    ? "The MT5 heartbeat is stale. Verify SignalForgeMonitor is attached to XAUUSD H1 and exporting Common\\Files\\SignalForge\\live.json."
    : manualPositions.length
      ? `${manualPositions.length} manual XAUUSD trade(s) are open. Dashboard monitoring continues, but the auto-trade validation is not clean until manual positions are closed.`
      : "Values come from your local MT5 terminal. This browser dashboard cannot place or modify orders.");
  const liveStrip = $("#liveStrip");
  if (liveStrip) liveStrip.classList.remove("hidden");
  setText("#liveHeartbeat", `${heartbeatAge}s ago`);
  setText("#liveAccount", `${account.mode || "UNKNOWN"} · ${account.login || "—"}`);
  setText("#liveBalance", money(account.balance, account.currency));
  setText("#liveEquity", money(account.equity, account.currency));
  setText("#liveToday", `${money(data.today?.realized, account.currency)} · ${data.today?.trades || 0} trades`);
  setText("#livePosition", position.open
    ? `${position.side || "UNKNOWN"} ${position.volume || "?"} · ${money(position.profit, account.currency)}`
    : "None");

  setText("#pairName", "XAU / USD");
  setText("#lastUpdated", `${data.heartbeat || "—"} · spread ${Number(market.spread || 0).toFixed(2)}`);
  setText("#lastPrice", `${Number(market.bid || 0).toFixed(2)} / ${Number(market.ask || 0).toFixed(2)}`);
  const badge = $("#signalBadge");
  if (badge) {
    badge.textContent = activeSignal.side || "WAIT";
    badge.className = `signal-badge ${activeSignal.side === "WAIT" ? "neutral" : String(activeSignal.side).toLowerCase()}`;
  }
  setText("#signalReason", activeSignal.reason || "No signal reason available.");
  const entryLabel = $("#entryLabel");
  if (entryLabel) entryLabel.textContent = confirmedEntrySide
    ? `${confirmedEntrySide} signal entry`
    : formingEntrySide
      ? `${formingEntrySide} setup forming`
      : "Trade entry";
  const entryValue = $("#entry");
  if (entryValue) {
    entryValue.textContent = confirmedEntrySide && activeSignal.entry ? Number(activeSignal.entry).toFixed(2) : "No confirmed trade";
    entryValue.className = confirmedEntrySide
      ? `entry-${confirmedEntrySide.toLowerCase()}`
      : formingEntrySide
        ? "entry-forming"
        : "";
  }
  setText("#stop", confirmedEntrySide && activeSignal.stop ? Number(activeSignal.stop).toFixed(2) : "—");
  setText("#target", confirmedEntrySide && activeSignal.target ? Number(activeSignal.target).toFixed(2) : "—");
  setText("#rr", confirmedEntrySide ? "1 : 2" : "—");
  setText("#confidenceValue", `${Number(activeSignal.score || 0).toFixed(0)} / 100`);
  setStyle("#confidenceBar", "width", `${Number(activeSignal.score || 0)}%`);
  renderLiveFactors(data);
  if (data.schema >= 2) renderExtendedLive(data, heartbeatAge);
  else {
    const liveDetails = $("#liveDetails");
    if (liveDetails) liveDetails.classList.add("hidden");
  }

  const candles = data.candles.map(c => ({ ...c, time: new Date(c.time.replace(/\./g, "-").replace(" ", "T")) }));
  state.datasets.XAUUSD = candles;
  renderChartFeedMeta(data, data.candles);
  const srOverlay = data.schema >= 2 ? analyzeSupportResistanceV2(data) : null;
  drawChart(candles, candles.map(c => c.fast), candles.map(c => c.slow), {
    ...(srOverlay || {}),
    bid: Number(market.bid),
    ask: Number(market.ask)
  });
}

async function refreshLive() {
  if (!state.liveHandle) return;
  try {
    const file = await state.liveHandle.getFile();
    const data = JSON.parse(await file.text());
    state.liveFileModifiedUnix = Math.floor(file.lastModified / 1000);
    data._fileModifiedUnix = state.liveFileModifiedUnix;
    const validationError = validateLivePayload(data);
    if (validationError) {
      throw new Error(validationError);
    }
    if (![1, 2, 3, 4].includes(data.schema)) throw new Error("Unsupported live-data schema.");
    state.liveFailures = 0;
    renderLive(data);
  } catch (error) {
    state.liveFailures += 1;
    setText("#noticeTitle", "Live feed refresh error.");
    setText("#noticeText", error.message);
    if (state.liveFailures > 6) {
      setConnectionState("MT5 FILE ERROR", "stale");
      const liveDetails = $("#liveDetails");
      if (liveDetails) liveDetails.classList.add("hidden");
    }
  }
}

async function connectLive() {
  if (!window.showOpenFilePicker) {
    alert("Live mode requires current Microsoft Edge or Google Chrome.");
    return;
  }
  try {
    const [handle] = await window.showOpenFilePicker({
      multiple: false,
      types: [{ description: "SignalForge live JSON", accept: { "application/json": [".json"] } }]
    });
    if (!handle) return;
    state.liveFileName = handle.name;
    try { await saveLiveHandle(handle); } catch (error) {
      console.warn("Live connection works, but this browser could not persist the file handle.", error);
    }
    const permission = await handle.queryPermission?.({ mode: "read" });
    if (permission !== "granted") {
      const requested = await handle.requestPermission?.({ mode: "read" });
      if (requested !== "granted") {
        setConnectionState("MT5 PERMISSION DENIED", "stale");
        setText("#noticeTitle", "Permission denied.");
        setText("#noticeText", "Please allow read access to the MT5 live JSON file.");
        return;
      }
    }
    await beginLiveUpdates(handle);
  } catch (error) {
    if (error.name !== "AbortError") alert(`Could not connect MT5: ${error.message}`);
  }
}

function mulberry32(seed) {
  return function () {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function demoCandles(pair, count = 420) {
  const meta = PAIRS[pair];
  const random = mulberry32([...pair].reduce((a, c) => a + c.charCodeAt(0), 17));
  const rows = [];
  let close = meta.seed;
  const now = Date.now() - count * 3600000;
  for (let i = 0; i < count; i++) {
    const cycle = Math.sin(i / 23) * meta.volatility * 0.18;
    const drift = (random() - .49) * meta.volatility;
    const open = close;
    close = Math.max(.0001, open + drift + cycle);
    const range = meta.volatility * (.25 + random() * .55);
    rows.push({
      time: new Date(now + i * 3600000),
      open, high: Math.max(open, close) + range * random(),
      low: Math.min(open, close) - range * random(), close
    });
  }
  return rows;
}

function ema(values, period) {
  const out = Array(values.length).fill(null);
  if (values.length < period) return out;
  let value = values.slice(0, period).reduce((a, b) => a + b, 0) / period;
  out[period - 1] = value;
  const k = 2 / (period + 1);
  for (let i = period; i < values.length; i++) {
    value = values[i] * k + value * (1 - k);
    out[i] = value;
  }
  return out;
}

function rsi(values, period = 14) {
  const out = Array(values.length).fill(null);
  if (values.length <= period) return out;
  let gain = 0, loss = 0;
  for (let i = 1; i <= period; i++) {
    const change = values[i] - values[i - 1];
    gain += Math.max(change, 0);
    loss += Math.max(-change, 0);
  }
  gain /= period; loss /= period;
  out[period] = 100 - 100 / (1 + gain / (loss || 1e-10));
  for (let i = period + 1; i < values.length; i++) {
    const change = values[i] - values[i - 1];
    gain = (gain * (period - 1) + Math.max(change, 0)) / period;
    loss = (loss * (period - 1) + Math.max(-change, 0)) / period;
    out[i] = 100 - 100 / (1 + gain / (loss || 1e-10));
  }
  return out;
}

function atr(candles, period = 14) {
  const tr = candles.map((c, i) => i === 0
    ? c.high - c.low
    : Math.max(c.high - c.low, Math.abs(c.high - candles[i - 1].close), Math.abs(c.low - candles[i - 1].close)));
  return ema(tr, period);
}

function analyze(candles, index = candles.length - 1) {
  const closes = candles.map(c => c.close);
  const fast = ema(closes, 20);
  const slow = ema(closes, 50);
  const momentum = rsi(closes, 14);
  const volatility = atr(candles, 14);
  if (index < 55 || !volatility[index]) return { side: "WAIT", score: 0, fast, slow, momentum, volatility };

  const c = closes[index], f = fast[index], s = slow[index], r = momentum[index], a = volatility[index];
  const trendDirection = f > s ? 1 : -1;
  const priceDirection = c > f ? 1 : -1;
  const slopeDirection = fast[index] > fast[index - 5] ? 1 : -1;
  const momentumDirection = r >= 52 && r <= 70 ? 1 : r <= 48 && r >= 30 ? -1 : 0;
  const votes = [trendDirection, priceDirection, slopeDirection, momentumDirection];
  const raw = votes.reduce((x, y) => x + y, 0);
  const side = raw >= 3 ? "BUY" : raw <= -3 ? "SELL" : "WAIT";
  const agreement = Math.abs(raw) / 4;
  const separation = Math.min(Math.abs(f - s) / (a || 1e-10), 1);
  const score = Math.round((agreement * .75 + separation * .25) * 100);
  const direction = side === "SELL" ? -1 : 1;
  return {
    side, score, fast, slow, momentum, volatility,
    entry: c,
    stop: side === "WAIT" ? null : c - direction * a * 1.5,
    target: side === "WAIT" ? null : c + direction * a * 3,
    reason: side === "WAIT" ? "Rules are not sufficiently aligned" : `${side === "BUY" ? "Bullish" : "Bearish"} trend and momentum agree`,
    factors: [
      { name: "EMA trend", value: f > s ? "Bullish" : "Bearish", direction: trendDirection, strength: Math.min(Math.abs(f-s)/a, 1) },
      { name: "Price structure", value: c > f ? "Above EMA 20" : "Below EMA 20", direction: priceDirection, strength: .72 },
      { name: "Momentum", value: `RSI ${r.toFixed(1)}`, direction: momentumDirection, strength: Math.min(Math.abs(r-50)/20, 1) },
      { name: "Volatility", value: `ATR ${a.toPrecision(4)}`, direction: 0, strength: .55 }
    ]
  };
}

function format(value, pair = state.active) {
  return value == null ? "—" : Number(value).toFixed(PAIRS[pair].decimals);
}

function renderTabs() {
  const tabs = document.querySelector("#pairTabs");
  tabs.innerHTML = Object.entries(PAIRS).map(([key, meta]) => `
    <button class="pair-tab ${key === state.active ? "active" : ""}" data-pair="${key}">
      <strong>${meta.label}</strong><span>${meta.status}</span>
    </button>`).join("");
  tabs.querySelectorAll("button").forEach(button => button.addEventListener("click", () => {
    state.active = button.dataset.pair;
    render();
  }));
}

function render() {
  renderTabs();
  const candles = state.datasets[state.active];
  const result = analyze(candles);
  const last = candles.at(-1);
  document.querySelector("#pairName").textContent = PAIRS[state.active].label;
  document.querySelector("#dataMode").textContent = state.mode;
  document.querySelector("#lastUpdated").textContent = last.time.toLocaleString();
  document.querySelector("#lastPrice").textContent = format(last.close);
  const badge = document.querySelector("#signalBadge");
  badge.textContent = result.side;
  badge.className = `signal-badge ${result.side.toLowerCase() === "wait" ? "neutral" : result.side.toLowerCase()}`;
  document.querySelector("#signalReason").textContent = result.reason || "Waiting for enough closed candles";
  document.querySelector("#entryLabel").textContent = result.side === "WAIT" ? "Trade entry" : `${result.side} signal entry`;
  const simulatedEntry = document.querySelector("#entry");
  simulatedEntry.textContent = result.side === "WAIT" ? "No confirmed trade" : format(result.entry);
  simulatedEntry.className = result.side === "WAIT" ? "" : `entry-${result.side.toLowerCase()}`;
  document.querySelector("#stop").textContent = result.side === "WAIT" ? "—" : format(result.stop);
  document.querySelector("#target").textContent = result.side === "WAIT" ? "—" : format(result.target);
  document.querySelector("#rr").textContent = result.side === "WAIT" ? "—" : "1 : 2";
  document.querySelector("#confidenceValue").textContent = `${result.score} / 100`;
  document.querySelector("#confidenceBar").style.width = `${result.score}%`;
  renderFactors(result.factors || []);
  drawChart(candles, result.fast, result.slow);
  resetTest();
}

function renderFactors(factors) {
  const list = $("#factorList");
  if (!list) return;
  if (!factors.length) {
    list.innerHTML = '<div class="empty-state">At least 55 candles are required.</div>';
    return;
  }
  list.innerHTML = factors.map(f => {
    const color = f.direction > 0 ? "var(--acid)" : f.direction < 0 ? "var(--red)" : "var(--amber)";
    return `<div class="factor">
      <span class="factor-name">${f.name}</span>
      <span class="factor-track"><i style="width:${Math.max(12, f.strength * 100)}%;background:${color}"></i></span>
      <span class="factor-value">${f.value}</span>
    </div>`;
  }).join("");
}

function drawChart(candles, fast, slow, overlays = {}) {
  const canvas = document.querySelector("#priceChart");
  const ratio = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * ratio;
  canvas.height = rect.height * ratio;
  const ctx = canvas.getContext("2d");
  ctx.scale(ratio, ratio);
  const w = rect.width, h = rect.height, pad = 16;
  const from = Math.max(0, candles.length - 120);
  const visible = candles.slice(from);
  const overlayZones = [];
  const strongestSupport = Array.isArray(overlays.supportZones)
    ? overlays.supportZones.slice().sort((a, b) => b.score - a.score).find(zone => Number.isFinite(zone.low) && Number.isFinite(zone.high))
    : null;
  const strongestResistance = Array.isArray(overlays.resistanceZones)
    ? overlays.resistanceZones.slice().sort((a, b) => b.score - a.score).find(zone => Number.isFinite(zone.low) && Number.isFinite(zone.high))
    : null;
  if (overlays.supportZone && Number.isFinite(overlays.supportZone.low) && Number.isFinite(overlays.supportZone.high)) {
    overlayZones.push({ ...overlays.supportZone, type: "support" });
  } else if (strongestSupport) {
    overlayZones.push({ ...strongestSupport, type: "support" });
  }
  if (overlays.resistanceZone && Number.isFinite(overlays.resistanceZone.low) && Number.isFinite(overlays.resistanceZone.high)) {
    overlayZones.push({ ...overlays.resistanceZone, type: "resistance" });
  } else if (strongestResistance) {
    overlayZones.push({ ...strongestResistance, type: "resistance" });
  }
  const currentPrice = visible.at(-1)?.close;
  if (overlayZones.length > 1 && Number.isFinite(currentPrice)) {
    overlayZones.sort((a, b) => Math.abs(currentPrice - a.center) - Math.abs(currentPrice - b.center));
    overlayZones.length = 1;
  }
  const overlayPrices = [Number(overlays.bid), Number(overlays.ask)].filter(Number.isFinite);
  const all = visible
    .flatMap(c => [c.low, c.high])
    .concat(fast.slice(from).filter(Boolean), slow.slice(from).filter(Boolean))
    .concat(overlayZones.flatMap(zone => [zone.low, zone.high]))
    .concat(overlayPrices);
  const min = Math.min(...all), max = Math.max(...all), range = max - min || 1;
  const x = i => pad + (i + .5) / visible.length * (w - pad * 2);
  const y = v => h - pad - (v - min) / range * (h - pad * 2);
  ctx.strokeStyle = "#202c26"; ctx.lineWidth = 1;
  for (let i = 1; i < 5; i++) {
    ctx.beginPath(); ctx.moveTo(pad, h * i / 5); ctx.lineTo(w - pad, h * i / 5); ctx.stroke();
  }

  overlayZones.forEach(zone => {
    const top = y(zone.high);
    const bottom = y(zone.low);
    const isResistance = zone.type === "resistance";
    const strokeColor = isResistance ? "rgba(255, 107, 107, 0.55)" : "rgba(185, 244, 92, 0.55)";
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 1.2;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(pad, top);
    ctx.lineTo(w - pad, top);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(pad, bottom);
    ctx.lineTo(w - pad, bottom);
    ctx.stroke();
    ctx.setLineDash([]);
  });

  const bid = Number(overlays.bid);
  const ask = Number(overlays.ask);
  if (Number.isFinite(bid)) {
    const bidY = y(bid);
    ctx.strokeStyle = "#ffcc66";
    ctx.lineWidth = 1.3;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.moveTo(pad, bidY);
    ctx.lineTo(w - pad, bidY);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "#ffcc66";
    ctx.font = "11px monospace";
    ctx.textAlign = "left";
    ctx.fillText(`BID ${bid.toFixed(2)}`, pad + 4, Math.max(12, bidY - 5));
  }
  if (Number.isFinite(ask) && Math.abs(ask - bid) > 0.01) {
    const askY = y(ask);
    ctx.strokeStyle = "rgba(255, 204, 102, .45)";
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 4]);
    ctx.beginPath();
    ctx.moveTo(pad, askY);
    ctx.lineTo(w - pad, askY);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  const candleWidth = Math.max(1, Math.min(8, (w - pad * 2) / visible.length * .62));
  visible.forEach((candle, i) => {
    const rising = candle.close >= candle.open;
    const color = rising ? "#b9f45c" : "#ff6b6b";
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x(i), y(candle.high));
    ctx.lineTo(x(i), y(candle.low));
    ctx.stroke();
    const top = y(Math.max(candle.open, candle.close));
    const bottom = y(Math.min(candle.open, candle.close));
    ctx.fillRect(x(i) - candleWidth / 2, top, candleWidth, Math.max(1, bottom - top));
  });
  function line(values, color, width) {
    ctx.beginPath(); ctx.strokeStyle = color; ctx.lineWidth = width;
    let started = false;
    values.forEach((v, i) => {
      if (v == null) return;
      const command = started ? "lineTo" : "moveTo";
      ctx[command](x(i), y(v)); started = true;
    });
    ctx.stroke();
  }
  line(fast.slice(from), "#b9f45c", 1.8);
  line(slow.slice(from), "#51d7c7", 1.5);
}

function drawEquityChart(points) {
  const canvas = document.querySelector("#equityChart");
  if (!canvas) return;
  const ratio = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * ratio;
  canvas.height = rect.height * ratio;
  const ctx = canvas.getContext("2d");
  ctx.scale(ratio, ratio);
  const w = rect.width, h = rect.height, pad = 18;
  ctx.clearRect(0, 0, w, h);
  if (!points.length) {
    ctx.fillStyle = "#899991";
    ctx.font = "12px monospace";
    ctx.fillText("Performance history will appear after SignalForge deals.", pad, h / 2);
    return;
  }
  const values = points.flatMap(p => [p.value, -p.drawdown, 0]);
  const min = Math.min(...values), max = Math.max(...values), range = max - min || 1;
  const x = i => pad + i / Math.max(1, points.length - 1) * (w - pad * 2);
  const y = value => h - pad - (value - min) / range * (h - pad * 2);
  ctx.strokeStyle = "#202c26";
  ctx.lineWidth = 1;
  for (let i = 1; i < 5; i++) {
    ctx.beginPath(); ctx.moveTo(pad, h * i / 5); ctx.lineTo(w - pad, h * i / 5); ctx.stroke();
  }
  ctx.strokeStyle = "#59665f";
  ctx.beginPath(); ctx.moveTo(pad, y(0)); ctx.lineTo(w - pad, y(0)); ctx.stroke();
  function plot(accessor, color) {
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    points.forEach((point, i) => ctx[i ? "lineTo" : "moveTo"](x(i), y(accessor(point))));
    ctx.stroke();
  }
  plot(point => -point.drawdown, "#ff6b6b");
  plot(point => point.value, "#b9f45c");
}

function backtest(candles) {
  let position = null, wins = 0, losses = 0, grossWin = 0, grossLoss = 0, equity = 0, peak = 0, maxDD = 0;
  for (let i = 55; i < candles.length - 1; i++) {
    if (!position) {
      const s = analyze(candles, i);
      if (s.side !== "WAIT") position = { ...s, direction: s.side === "BUY" ? 1 : -1 };
      continue;
    }
    const candle = candles[i];
    const stopHit = position.direction === 1 ? candle.low <= position.stop : candle.high >= position.stop;
    const targetHit = position.direction === 1 ? candle.high >= position.target : candle.low <= position.target;
    if (stopHit || targetHit) {
      // If both occur in one bar, assume the stop happened first: deliberately conservative.
      const r = stopHit ? -1 : 2;
      equity += r; peak = Math.max(peak, equity); maxDD = Math.max(maxDD, peak - equity);
      if (r > 0) { wins++; grossWin += r; } else { losses++; grossLoss += Math.abs(r); }
      position = null;
    }
  }
  const trades = wins + losses;
  return {
    trades,
    winRate: trades ? wins / trades * 100 : 0,
    profitFactor: grossLoss ? grossWin / grossLoss : grossWin ? Infinity : 0,
    maxDD
  };
}

function showBacktest() {
  const result = backtest(state.datasets[state.active]);
  const emptyNode = $("#testEmpty");
  const resultNode = $("#testResults");
  if (emptyNode) emptyNode.classList.add("hidden");
  if (resultNode) resultNode.classList.remove("hidden");
  setText("#tradeCount", result.trades);
  setText("#winRate", `${result.winRate.toFixed(1)}%`);
  setText("#profitFactor", Number.isFinite(result.profitFactor) ? result.profitFactor.toFixed(2) : "∞");
  setText("#drawdown", `${result.maxDD.toFixed(1)} R`);
}

function resetTest() {
  const emptyNode = $("#testEmpty");
  const resultNode = $("#testResults");
  if (emptyNode) emptyNode.classList.remove("hidden");
  if (resultNode) resultNode.classList.add("hidden");
}

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 3) throw new Error("The CSV needs a header and at least two candle rows.");
  const delimiter = lines[0].includes(";") ? ";" : ",";
  const headers = lines[0].split(delimiter).map(h => h.trim().toLowerCase().replace(/[<>]/g, ""));
  const aliases = {
    time: ["time", "date", "datetime", "timestamp"],
    open: ["open"], high: ["high"], low: ["low"], close: ["close"]
  };
  const indexes = Object.fromEntries(Object.entries(aliases).map(([key, names]) =>
    [key, headers.findIndex(h => names.includes(h))]));
  if (Object.values(indexes).some(i => i < 0)) throw new Error("Required columns: time/date, open, high, low, close.");
  const rows = lines.slice(1).map(line => {
    const parts = line.split(delimiter);
    const timeRaw = parts[indexes.time].trim();
    const numericTime = Number(timeRaw);
    const time = /^\d+$/.test(timeRaw)
      ? new Date(numericTime < 1e12 ? numericTime * 1000 : numericTime)
      : new Date(timeRaw);
    return {
      time,
      open: Number(parts[indexes.open]), high: Number(parts[indexes.high]),
      low: Number(parts[indexes.low]), close: Number(parts[indexes.close])
    };
  }).filter(r => !Number.isNaN(r.time.getTime()) && ["open","high","low","close"].every(k => Number.isFinite(r[k])));
  rows.sort((a, b) => a.time - b.time);
  if (rows.length < 55) throw new Error(`Only ${rows.length} valid rows found; at least 55 are required.`);
  return rows;
}

document.querySelector("#csvInput").addEventListener("change", async event => {
  const file = event.target.files[0];
  if (!file) return;
  try {
    state.datasets[state.active] = parseCsv(await file.text());
    state.mode = `IMPORTED · ${file.name.toUpperCase()}`;
    render();
  } catch (error) {
    alert(`Could not import CSV: ${error.message}`);
  } finally {
    event.target.value = "";
  }
});

document.querySelector("#resetDemo").addEventListener("click", () => {
  clearInterval(state.liveTimer);
  state.liveTimer = null;
  state.liveHandle = null;
  state.liveData = null;
  state.blockedLog = [];
  saveBlockedLog();
  Object.keys(PAIRS).forEach(pair => state.datasets[pair] = demoCandles(pair));
  state.mode = "SIMULATED DATA";
  $("#liveStrip")?.classList.add("hidden");
  $("#liveDetails")?.classList.add("hidden");
  setText("#noticeTitle", "Research mode.");
  setText("#noticeText", "Prices are simulated until you connect MT5 or import data. This dashboard cannot place orders.");
  setText("#connectLive", "Connect MT5 live file");
  setConnectionState("SIMULATED DATA", "");
  render();
});
document.querySelector("#connectLive")?.addEventListener("click", connectLive);
const runBacktestButton = $("#runBacktest");
if (runBacktestButton) {
  runBacktestButton.addEventListener("click", showBacktest);
}
window.addEventListener("resize", () => {
  if (state.liveData) {
    const candles = state.liveData.candles.map(c => ({ ...c, time: new Date(c.time.replace(/\./g, "-").replace(" ", "T")) }));
    const srOverlay = state.liveData.schema >= 2 ? analyzeSupportResistanceV2(state.liveData) : null;
    drawChart(candles, state.liveData.candles.map(c => c.fast), state.liveData.candles.map(c => c.slow), {
      ...(srOverlay || {}),
      bid: Number(state.liveData.market?.bid),
      ask: Number(state.liveData.market?.ask)
    });
    if (state.liveData.schema >= 2) drawEquityChart(state.liveData.history.equity);
    return;
  }
  const candles = state.datasets[state.active];
  const result = analyze(candles);
  drawChart(candles, result.fast, result.slow);
});

Object.keys(PAIRS).forEach(pair => state.datasets[pair] = demoCandles(pair));
render();
restoreLiveConnection();
