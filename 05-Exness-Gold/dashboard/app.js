const $ = selector => document.querySelector(selector);

const state = {
  handle: null,
  timer: null,
  live: false,
  lastData: null
};

function demoCandles() {
  const candles = [];
  let price = 2330;
  const now = Math.floor(Date.now() / 1000 / 3600) * 3600;
  for (let i = 64; i >= 0; i--) {
    const wave = Math.sin(i * .51) * 2.2 + Math.cos(i * .17) * 3.4;
    const open = price;
    const close = price + wave * .23 + (i % 3 - 1) * .34;
    candles.push({
      time: now - i * 3600,
      open,
      high: Math.max(open, close) + .8 + (i % 4) * .13,
      low: Math.min(open, close) - .7 - (i % 5) * .11,
      close
    });
    price = close;
  }
  return candles;
}

function demoData() {
  const candles = demoCandles();
  const price = candles.at(-1).close;
  return {
    schema: 2,
    heartbeat: Math.floor(Date.now() / 1000),
    terminal: { connected: true, algoTrading: false },
    account: {
      mode: "DEMO", server: "Preview feed", loginTail: "0000", currency: "USD",
      balance: 1000000, equity: 1000000, freeMargin: 1000000, marginLevel: 0
    },
    engine: {
      version: "1.32", mode: "SIGNALS ONLY",
      status: "Preview data — connect MT5 for live status",
      emergencyStop: false, exnessVerified: true
    },
    market: {
      symbol: "XAUUSD", bid: price, ask: price + .19, spreadPoints: 19,
      signal: "WAIT", detail: "RSI 51.8 | ADX 19.6 | ATR 8.42",
      nextBarTime: Math.floor(Date.now() / 1000 / 3600 + 1) * 3600,
      factors: {
        h1: { buy: true, sell: false }, h4: { buy: true, sell: false },
        breakout: { buy: false, sell: false }, momentum: { buy: true, sell: false },
        strength: { buy: false, sell: false }
      }
    },
    risk: {
      riskPercent: .02, riskCash: 200, dayStartEquity: 1000000,
      dailyLossPercent: 0, dailyLossLimit: .15,
      drawdownPercent: 0, drawdownLimit: 1,
      tradesToday: 0, tradesLimit: 5, realizedToday: 0
    },
    position: { open: false },
    shadow: {
      enabled: true, referenceEquity: 1000000, open: false, side: "FLAT",
      entry: 0, stop: 0, target: 0, volume: 0, currentR: 0, mfeR: 0, maeR: 0,
      stats: { trades: 0, wins: 0, losses: 0, winRate: 0, netR: 0, estimatedNet: 0, profitFactor: 0, maxDrawdownR: 0 }
    },
    execution: { fills: 0, lastSlippagePoints: 0, averageSlippagePoints: 0, maxSlippagePoints: 0 },
    alerts: {
      lastLevel: "NONE", lastMessage: "", lastTime: 0, lastDispatch: 0,
      push: { enabled: true, configured: false, status: "NOT SENT", error: 0 },
      whatsApp: { enabled: true, status: "NOT SENT", error: 0 },
      journal: { enabled: true, status: "NOT WRITTEN", file: "activity-xauusd.csv", lastEvent: "", lastTime: 0 }
    },
    news: {
      enabled: true, blocked: false, status: "CLEAR", event: "",
      eventTime: 0, minutesTo: 0, alertMinutes: 30, postMinutes: 15, error: 0
    },
    candles
  };
}

function money(value, currency = "USD") {
  return new Intl.NumberFormat(undefined, {
    style: "currency", currency, minimumFractionDigits: 2, maximumFractionDigits: 2
  }).format(Number(value) || 0);
}

function number(value, digits = 3) {
  return Number.isFinite(Number(value)) ? Number(value).toFixed(digits) : "—";
}

function setText(selector, value) {
  const element = $(selector);
  if (element) element.textContent = value;
}

function setConnection(kind, label) {
  $("#connectionDot").className = `connection-dot ${kind}`;
  setText("#connectionLabel", label);
}

function ratioBar(selector, value, limit) {
  const ratio = limit > 0 ? Math.min(100, Math.max(0, value / limit * 100)) : 0;
  const bar = $(selector);
  bar.style.width = `${ratio}%`;
  bar.className = ratio >= 100 ? "danger" : ratio >= 70 ? "warn" : "";
  return ratio;
}

function renderHealth(data, age) {
  const positionProtected = !data.position?.open || data.position.protected;
  const checks = [
    ["MT5 terminal", data.terminal?.connected, data.terminal?.connected ? "CONNECTED" : "OFFLINE"],
    ["Feed heartbeat", age <= 10, age <= 10 ? `${age}s AGO` : `${age}s STALE`],
    ["Exness server", data.engine?.exnessVerified, data.engine?.exnessVerified ? "VERIFIED" : "CHECK"],
    ["Algo Trading", data.terminal?.algoTrading, data.terminal?.algoTrading ? "ENABLED" : "DISABLED"],
    ["Emergency stop", !data.engine?.emergencyStop, data.engine?.emergencyStop ? "ACTIVE" : "CLEAR"],
    ["Position protection", positionProtected, positionProtected ? "VERIFIED" : "MISSING"],
    ["USD news window", !data.news?.blocked, data.news?.blocked ? "ENTRIES BLOCKED" : (data.news?.status || "CLEAR")]
  ];
  const failed = checks.filter(([, ok]) => !ok).length;
  const healthState = $("#healthState");
  healthState.textContent = failed ? `${failed} WARNING${failed > 1 ? "S" : ""}` : "HEALTHY";
  healthState.className = `pill ${failed ? "danger" : "healthy"}`;
  $("#healthList").innerHTML = checks.map(([label, ok, value]) =>
    `<div class="health-row"><span>${label}</span><strong class="${ok ? "ok" : "bad"}">${value}</strong></div>`
  ).join("");
}

function channelClass(status) {
  const value = String(status || "").toUpperCase();
  if (value === "SENT" || value === "DISABLED") return value === "SENT" ? "" : "warn";
  if (value.includes("FAILED") || value.includes("ERROR")) return "bad";
  return "warn";
}

function renderAlerts(data) {
  const alerts = data.alerts || {};
  const level = alerts.lastLevel || "NONE";
  setText("#lastAlertLevel", level);
  setText("#lastAlertMessage", alerts.lastMessage || "Waiting for trend, watch, trade or position events.");
  setText("#lastAlertTime", alerts.lastTime
    ? new Date(Number(alerts.lastTime) * 1000).toLocaleString()
    : "No alert dispatched");
  const statePill = $("#alertState");
  statePill.textContent = level === "NONE" ? "NO ALERT YET" : level;
  statePill.className = `pill ${["RISK", "CRITICAL"].includes(level) ? "danger" : level === "TRADE" || level === "FILL" || level === "PROFIT" ? "healthy" : "locked"}`;

  const push = alerts.push || {};
  setText("#pushStatus", push.status || (push.enabled ? "NOT SENT" : "DISABLED"));
  $("#pushStatus").className = channelClass(push.status);
  setText("#pushDetail", !push.enabled ? "Disabled in EA" : push.configured ? "MetaQuotes ID configured" : "Configure MetaQuotes ID");

  const whatsApp = alerts.whatsApp || {};
  setText("#whatsappStatus", whatsApp.status || (whatsApp.enabled ? "NOT SENT" : "DISABLED"));
  $("#whatsappStatus").className = channelClass(whatsApp.status);
  setText("#whatsappDetail", whatsApp.enabled ? "http://127.0.0.1:8787/alert" : "Disabled in EA");

  const journal = alerts.journal || {};
  setText("#journalStatus", journal.status || (journal.enabled ? "NOT WRITTEN" : "DISABLED"));
  $("#journalStatus").className = channelClass(journal.status === "WRITING" ? "SENT" : journal.status);
  setText("#journalDetail", journal.enabled
    ? `${journal.file || "activity.csv"}${journal.lastEvent ? ` · ${journal.lastEvent}` : ""}`
    : "Disabled in EA");
}

function renderNews(data) {
  const news = data.news || {};
  const statePill = $("#newsState");
  statePill.textContent = news.status || "WAITING";
  statePill.className = `pill ${news.blocked ? "danger" : news.status === "CLEAR" ? "healthy" : "locked"}`;
  setText("#newsEvent", news.event || (news.enabled ? "No high-impact USD event selected" : "News guard disabled"));
  if (Number(news.eventTime) > 0) {
    const direction = Number(news.minutesTo) >= 0 ? "in" : "occurred";
    const minutes = Math.abs(Number(news.minutesTo));
    setText("#newsCountdown", `${direction} ${minutes} minute${minutes === 1 ? "" : "s"} · ${new Date(Number(news.eventTime) * 1000).toLocaleString()}`);
  } else {
    setText("#newsCountdown", "High-impact USD events · server-time calendar");
  }
}

function renderPosition(position, currency) {
  const open = Boolean(position?.open);
  $("#flatPosition").classList.toggle("hidden", open);
  $("#openPosition").classList.toggle("hidden", !open);
  const statePill = $("#positionState");
  if (!open) {
    statePill.textContent = "FLAT";
    statePill.className = "pill neutral";
    return;
  }
  statePill.textContent = position.protected ? "PROTECTED" : "UNPROTECTED";
  statePill.className = `pill ${position.protected ? "healthy" : "danger"}`;
  setText("#positionSide", position.side || "—");
  $("#positionSide").style.color = position.side === "SELL" ? "var(--red)" : "var(--green)";
  setText("#positionVolume", `${number(position.volume, 2)} lots`);
  setText("#positionEntry", number(position.entry));
  setText("#positionStop", number(position.stop));
  setText("#positionTarget", number(position.target));
  setText("#positionProfit", money(position.profit, currency));
  if (Number.isFinite(Number(position.rMultiple))) {
    setText("#positionProfit", `${money(position.profit, currency)} · ${number(position.rMultiple, 2)}R`);
  }
  $("#positionProfit").className = Number(position.profit) >= 0 ? "positive" : "negative";
  const protection = $("#protectionState");
  protection.textContent = position.protected ? "SL + TP VERIFIED" : "PROTECTION MISSING";
  protection.className = `protection ${position.protected ? "" : "bad"}`.trim();
}

function renderReadiness(market) {
  const factors = market?.factors || {};
  const labels = [["H1", "h1"], ["H4", "h4"], ["BREAK", "breakout"], ["MOM", "momentum"], ["ADX", "strength"]];
  $("#factorList").innerHTML = labels.map(([label, key]) => {
    const value = factors[key] || {};
    const side = value.buy ? "buy" : value.sell ? "sell" : "";
    return `<div class="factor ${side}">${label}${side ? ` ${side.toUpperCase()}` : " WAIT"}</div>`;
  }).join("");
  updateCountdown(market?.nextBarTime);
}

function updateCountdown(nextBarTime) {
  const remaining = Math.max(0, Number(nextBarTime || 0) - Math.floor(Date.now() / 1000));
  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  setText("#nextH1", nextBarTime ? `NEXT H1 ${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}` : "NEXT H1 --:--");
}

function renderShadow(shadow, currency) {
  const value = shadow || {};
  const stats = value.stats || {};
  const open = Boolean(value.open);
  const statePill = $("#shadowState");
  statePill.textContent = !value.enabled ? "DISABLED" : open ? `${value.side || "OPEN"} PAPER` : "FLAT";
  statePill.className = `pill ${open ? (value.side === "SELL" ? "danger" : "healthy") : "neutral"}`;
  setText("#shadowTrades", stats.trades ?? 0);
  setText("#shadowWinRate", Number(stats.trades) ? `${number(stats.winRate, 1)}%` : "--");
  setText("#shadowProfitFactor", Number(stats.trades) ? number(stats.profitFactor, 2) : "--");
  setText("#shadowNetR", `${Number(stats.netR) >= 0 ? "+" : ""}${number(stats.netR, 2)}R`);
  $("#shadowNetR").className = Number(stats.netR) >= 0 ? "positive" : "negative";
  setText("#shadowEstimated", `${money(stats.estimatedNet, currency)} estimated`);
  setText("#shadowDrawdown", `${number(stats.maxDrawdownR, 2)}R`);
  setText("#shadowReference", money(value.referenceEquity, currency));
  $("#shadowFlat").classList.toggle("hidden", open);
  $("#shadowOpen").classList.toggle("hidden", !open);
  if (!open) return;
  setText("#shadowSide", `${value.side || "--"} / ${number(value.volume, 2)} lots`);
  setText("#shadowCurrentR", `${Number(value.currentR) >= 0 ? "+" : ""}${number(value.currentR, 2)}R`);
  $("#shadowCurrentR").className = Number(value.currentR) >= 0 ? "positive" : "negative";
  setText("#shadowEntry", number(value.entry));
  setText("#shadowStops", `${number(value.stop)} / ${number(value.target)}`);
  setText("#shadowExcursion", `${number(value.mfeR, 2)}R / ${number(value.maeR, 2)}R`);
}

function renderExecution(execution) {
  const value = execution || {};
  const fills = Number(value.fills || 0);
  setText("#executionFills", fills);
  setText("#executionLast", fills ? `${number(value.lastSlippagePoints, 1)} pts` : "--");
  setText("#executionAverage", fills ? `${number(value.averageSlippagePoints, 1)} pts` : "--");
  setText("#executionMaximum", fills ? `${number(value.maxSlippagePoints, 1)} pts` : "--");
  const statePill = $("#executionState");
  statePill.textContent = fills ? `${fills} FILL${fills === 1 ? "" : "S"}` : "NO FILLS";
  statePill.className = `pill ${fills ? "healthy" : "neutral"}`;
}

const STALE_THRESHOLD_SECONDS = 25;

function render(data, live = false) {
  state.lastData = data;
  const currency = data.account?.currency || "USD";
  const age = Math.max(0, Math.floor(Date.now() / 1000 - Number(data.heartbeat || 0)));
  const fresh = age <= STALE_THRESHOLD_SECONDS;

  if (live) {
    setConnection(fresh ? "live" : "stale", fresh ? "MT5 LIVE" : "MT5 FEED STALE");
    setText("#noticeTitle", fresh ? "Live MT5 feed connected" : "Feed heartbeat is stale");
    setText("#noticeText", fresh
      ? "Monitoring the selected file every two seconds."
      : `The JSON file is not being refreshed fast enough. Heartbeat age is ${age}s. Confirm MT5 and the attached EA are exporting live updates.`);
    $("#connectButton").textContent = "Reconnect MT5 file";
  } else {
    setConnection("demo", "DEMO PREVIEW");
    setText("#noticeTitle", "Preview mode");
    setText("#noticeText", "Connect the EA’s live.json file to begin read-only monitoring.");
  }

  setText("#accountMode", data.account?.mode || "—");
  setText("#accountServer", data.account?.server || "—");
  setText("#balance", money(data.account?.balance, currency));
  setText("#loginTail", `Login ····${data.account?.loginTail || "—"}`);
  setText("#equity", money(data.account?.equity, currency));
  const dayDelta = Number(data.account?.equity || 0) - Number(data.risk?.dayStartEquity || 0);
  setText("#equityDelta", `${dayDelta >= 0 ? "+" : ""}${money(dayDelta, currency)} today`);
  $("#equityDelta").className = dayDelta >= 0 ? "positive" : "negative";
  setText("#freeMargin", money(data.account?.freeMargin, currency));
  setText("#marginLevel", Number(data.account?.marginLevel) > 0 ? `${number(data.account.marginLevel, 1)}% margin level` : "No margin used");
  setText("#heartbeat", fresh ? "LIVE" : "STALE");
  setText("#lastUpdate", age === 0 ? "Just now" : `${age}s ago`);

  const engineMode = data.engine?.mode || "UNKNOWN";
  setText("#engineMode", engineMode);
  $("#engineMode").className = `pill ${engineMode === "TRADING ARMED" ? "healthy" : engineMode.includes("EMERGENCY") ? "danger" : "locked"}`;
  setText("#engineStatus", data.engine?.status || "—");

  const signal = String(data.market?.signal || "WAIT").toUpperCase();
  setText("#signalBadge", signal);
  $("#signalBadge").className = `signal-badge ${signal.toLowerCase()}`;
  setText("#symbol", data.market?.symbol || "XAUUSD");
  setText("#heroInstrument", data.market?.symbol || "XAUUSD");
  setText("#chartInstrument", data.market?.symbol || "XAUUSD");
  setText("#price", number(data.market?.bid));
  setText("#signalDetail", data.market?.detail || "—");
  setText("#bid", number(data.market?.bid));
  setText("#ask", number(data.market?.ask));
  setText("#spread", `${number(data.market?.spreadPoints, 1)} pts`);
  renderReadiness(data.market);

  setText("#riskCash", money(data.risk?.riskCash, currency));
  setText("#riskPercent", `${number(data.risk?.riskPercent, 3)}% of equity`);
  setText("#tradesToday", `${data.risk?.tradesToday ?? 0} / ${data.risk?.tradesLimit ?? 0}`);
  setText("#realizedToday", `${money(data.risk?.realizedToday, currency)} realized`);
  const daily = Number(data.risk?.dailyLossPercent || 0);
  const dailyLimit = Number(data.risk?.dailyLossLimit || 0);
  const drawdown = Number(data.risk?.drawdownPercent || 0);
  const drawdownLimit = Number(data.risk?.drawdownLimit || 0);
  setText("#dailyLossText", `${number(daily, 3)}% / ${number(dailyLimit, 3)}%`);
  setText("#drawdownText", `${number(drawdown, 3)}% / ${number(drawdownLimit, 3)}%`);
  const dailyRatio = ratioBar("#dailyLossBar", daily, dailyLimit);
  const drawdownRatio = ratioBar("#drawdownBar", drawdown, drawdownLimit);
  const riskDanger = dailyRatio >= 100 || drawdownRatio >= 100;
  const riskState = $("#riskState");
  riskState.textContent = riskDanger ? "LIMIT REACHED" : dailyRatio >= 70 || drawdownRatio >= 70 ? "WATCH" : "HEALTHY";
  riskState.className = `pill ${riskDanger ? "danger" : dailyRatio >= 70 || drawdownRatio >= 70 ? "locked" : "healthy"}`;

  renderPosition(data.position, currency);
  renderShadow(data.shadow, currency);
  renderExecution(data.execution);
  renderHealth(data, age);
  renderAlerts(data);
  renderNews(data);
  drawChart(data.candles || []);
}

function drawChart(candles) {
  const canvas = $("#chart");
  const rect = canvas.getBoundingClientRect();
  const scale = window.devicePixelRatio || 1;
  canvas.width = Math.max(1, Math.floor(rect.width * scale));
  canvas.height = Math.max(1, Math.floor(rect.height * scale));
  const ctx = canvas.getContext("2d");
  ctx.scale(scale, scale);
  const width = rect.width;
  const height = rect.height;
  ctx.clearRect(0, 0, width, height);
  if (!candles.length) return;

  const visible = candles.slice(-70);
  const high = Math.max(...visible.map(c => Number(c.high)));
  const low = Math.min(...visible.map(c => Number(c.low)));
  const range = Math.max(.001, high - low);
  const pad = { top: 14, right: 55, bottom: 20, left: 4 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;
  const y = value => pad.top + (high - value) / range * plotH;

  ctx.strokeStyle = "rgba(146,178,161,.10)";
  ctx.lineWidth = 1;
  ctx.fillStyle = "#82968c";
  ctx.font = "10px ui-monospace, monospace";
  for (let i = 0; i <= 4; i++) {
    const yy = pad.top + plotH * i / 4;
    const value = high - range * i / 4;
    ctx.beginPath();
    ctx.moveTo(pad.left, yy);
    ctx.lineTo(width - pad.right, yy);
    ctx.stroke();
    ctx.fillText(value.toFixed(2), width - 49, yy + 3);
  }

  const slot = plotW / visible.length;
  const bodyW = Math.max(2, Math.min(8, slot * .58));
  visible.forEach((candle, index) => {
    const x = pad.left + slot * index + slot / 2;
    const open = y(Number(candle.open));
    const close = y(Number(candle.close));
    const up = Number(candle.close) >= Number(candle.open);
    ctx.strokeStyle = up ? "#43f29a" : "#ff6b72";
    ctx.fillStyle = up ? "#43f29a" : "#ff6b72";
    ctx.beginPath();
    ctx.moveTo(x, y(Number(candle.high)));
    ctx.lineTo(x, y(Number(candle.low)));
    ctx.stroke();
    ctx.fillRect(x - bodyW / 2, Math.min(open, close), bodyW, Math.max(1, Math.abs(close - open)));
  });
}

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("ExnessGoldGuardDashboard", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("handles");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function saveHandle(handle) {
  const database = await openDatabase();
  await new Promise((resolve, reject) => {
    const transaction = database.transaction("handles", "readwrite");
    transaction.objectStore("handles").put(handle, "live-json");
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error);
  });
  database.close();
}

async function loadHandle() {
  const database = await openDatabase();
  const handle = await new Promise((resolve, reject) => {
    const request = database.transaction("handles", "readonly").objectStore("handles").get("live-json");
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
  database.close();
  return handle;
}

async function refreshLive() {
  if (!state.handle) return;
  try {
    const file = await state.handle.getFile();
    const data = JSON.parse(await file.text());
    if (Number(data.schema) < 1 || Number(data.schema) > 2) throw new Error("Unsupported dashboard schema");
    state.live = true;
    render(data, true);
  } catch (error) {
    console.warn("Live feed refresh failed.", error);
    setConnection("stale", "MT5 FILE ERROR");
    setText("#noticeTitle", "Could not read the live feed");
    setText("#noticeText", "Reconnect the file or confirm the EA is exporting valid JSON.");
  }
}

async function beginLive(handle) {
  state.handle = handle;
  clearInterval(state.timer);
  await refreshLive();
  state.timer = setInterval(refreshLive, 2000);
}

async function connectLive() {
  try {
    if (!window.showOpenFilePicker) {
      $("#fileFallback").click();
      return;
    }
    const [handle] = await window.showOpenFilePicker({
      multiple: false,
      types: [{ description: "Gold Guard live feed", accept: { "application/json": [".json"] } }]
    });
    await saveHandle(handle);
    await beginLive(handle);
  } catch (error) {
    if (error.name === "AbortError") return;
    console.error(error);
    setText("#noticeTitle", "Unable to open the browser picker");
    setText("#noticeText", "Use the hidden file selector or navigate manually to the Exness Gold Guard live JSON file.");
    $("#fileFallback").click();
  }
}

async function refreshCurrentFile() {
  if (!state.handle) {
    setText("#noticeTitle", "No live file selected");
    setText("#noticeText", "Choose the MT5 live JSON file first, then use Refresh live feed.");
    return;
  }
  await refreshLive();
}

async function restoreConnection() {
  if (!window.showOpenFilePicker || !window.indexedDB) return;
  try {
    const handle = await loadHandle();
    if (!handle) return;
    if (await handle.queryPermission({ mode: "read" }) === "granted") {
      await beginLive(handle);
    } else {
      state.handle = handle;
      $("#connectButton").textContent = "Resume MT5 connection";
    }
  } catch (error) {
    console.warn("Saved file permission could not be restored.", error);
  }
}

$("#connectButton").addEventListener("click", connectLive);
$("#refreshButton").addEventListener("click", refreshCurrentFile);
$("#manualButton").addEventListener("click", () => $("#fileFallback").click());
$("#sampleButton").addEventListener("click", async () => {
  try {
    const response = await fetch("sample-live.json");
    const data = await response.json();
    render(data, true);
    setText("#noticeText", "Loaded sample feed from dashboard/sample-live.json.");
    setText("#noticeTitle", "Sample feed loaded");
  } catch (error) {
    console.error("Sample feed load failed", error);
    setText("#noticeTitle", "Could not load sample feed");
    setText("#noticeText", "Open the dashboard from a local server or use a browser that allows local file access.");
  }
});
$("#demoButton").addEventListener("click", () => {
  clearInterval(state.timer);
  state.live = false;
  render(demoData(), false);
});
$("#fileFallback").addEventListener("change", async event => {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    render(JSON.parse(await file.text()), true);
    setText("#noticeText", "Snapshot loaded. Use Edge or Chrome file access for automatic refresh.");
  } catch {
    setText("#noticeTitle", "Invalid live file");
  }
});
window.addEventListener("resize", () => state.lastData && drawChart(state.lastData.candles || []));
setInterval(() => state.lastData && updateCountdown(state.lastData.market?.nextBarTime), 1000);

render(demoData(), false);
restoreConnection();
