const $ = selector => document.querySelector(selector);

// Direct file launches cannot securely read private account telemetry across
// origins. Move them onto the loopback-only dashboard server so auto-connect
// remains same-origin and the Host/Origin protections stay effective.
if (window.location.protocol === "file:") {
  window.location.replace("http://127.0.0.1:3030/");
}

const state = {
  handle: null,
  timer: null,
  live: false,
  lastData: null,
  history: null
};

function preferredTheme() {
  try {
    const saved = localStorage.getItem("exness-guard-theme");
    if (saved === "light" || saved === "dark") return saved;
  } catch {
    // Theme persistence is optional.
  }
  return window.matchMedia?.("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

function applyTheme(theme, persist = false) {
  const resolved = theme === "light" ? "light" : "dark";
  document.documentElement.dataset.theme = resolved;
  const isLight = resolved === "light";
  const button = $("#themeToggle");
  if (button) {
    button.setAttribute("aria-pressed", String(isLight));
    button.setAttribute("aria-label", `Switch to ${isLight ? "dark" : "light"} mode`);
  }
  setText("#themeIcon", isLight ? "☾" : "☀");
  setText("#themeLabel", isLight ? "DARK" : "LIGHT");
  if (persist) {
    try {
      localStorage.setItem("exness-guard-theme", resolved);
    } catch {
      // Continue when storage is unavailable.
    }
  }
  if (state.lastData) drawChart(state.lastData.candles || []);
}

applyTheme(preferredTheme());

$("#themeToggle")?.addEventListener("click", () => {
  const current = document.documentElement.dataset.theme || "dark";
  applyTheme(current === "dark" ? "light" : "dark", true);
});

if (!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
  let pointerFrame = 0;
  window.addEventListener("pointermove", event => {
    if (pointerFrame) cancelAnimationFrame(pointerFrame);
    pointerFrame = requestAnimationFrame(() => {
      document.documentElement.style.setProperty("--mouse-x", `${event.clientX}px`);
      document.documentElement.style.setProperty("--mouse-y", `${event.clientY}px`);
      pointerFrame = 0;
    });
  }, { passive: true });
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>'"]/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
  })[character]);
}

const LIVE_ENDPOINTS = [
  "/live.json",
  "http://localhost:3030/live.json",
  "http://127.0.0.1:3030/live.json"
];

const HISTORY_ENDPOINTS = [
  "/signals-history.json",
  "http://localhost:3030/signals-history.json",
  "http://127.0.0.1:3030/signals-history.json"
];

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
    schema: 3,
    heartbeat: Math.floor(Date.now() / 1000),
    terminal: { connected: true, algoTrading: false },
    account: {
      mode: "DEMO", server: "Preview feed", loginTail: "0000", currency: "USD",
      balance: 1000000, equity: 1000000, freeMargin: 1000000, marginLevel: 0
    },
    engine: {
      version: "1.41", mode: "SIGNALS ONLY",
      status: "Preview data — connect MT5 for live status",
      emergencyStop: false, exnessVerified: true
    },
    market: {
      symbol: "XAUUSD", bid: price, ask: price + .19, spreadPoints: 19,
      signal: "WAIT", detail: "RSI 51.8 | ADX 19.6 | ATR 8.42",
      nextBarTime: Math.floor(Date.now() / 1000 / 3600 + 1) * 3600,
      structure: { support: price - 3.2, resistance: price + 4.8, window: 20 },
      orderBlock: {
        required: true, state: "VALID", valid: true, side: "BUY",
        time: candles.at(-8).time, createdTime: candles.at(-3).time,
        expiryTime: candles.at(-3).time + 12 * 1800,
        low: price - 2.7, high: price - 1.5, entry: price - 1.7,
        stop: price - 2.72, target: price + 1.36, pending: true,
        mss: { side: "BUY", time: candles.at(-3).time, swingPrice: price - .4 },
        fvg: { side: "BUY", time: candles.at(-5).time, low: price - 1.1, high: price - .7 }
      },
      factors: {
        h1: { buy: true, sell: false }, h4: { buy: true, sell: false },
        breakout: { buy: false, sell: false }, momentum: { buy: true, sell: false },
        strength: { buy: false, sell: false },
        volatility: { buy: true, sell: true }, timeofday: { buy: true, sell: true },
        emaslope: { buy: true, sell: false }, prevstrength: { buy: true, sell: true },
        m5confirm: { buy: false, sell: false }, stochastic: { buy: true, sell: false },
        tickvol: { buy: true, sell: true },
        sr: { buy: true, sell: false }
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
      enabled: true, referenceEquity: 1000000, pending: false, open: false, side: "FLAT",
      entry: 0, stop: 0, target: 0, volume: 0, currentR: 0, mfeR: 0, maeR: 0,
      stats: { trades: 0, wins: 0, losses: 0, winRate: 0, netR: 0, estimatedNet: 0, profitFactor: 0, maxDrawdownR: 0 }
    },
    validation: { shadowTrades: 0, shadowWins: 0, shadowLosses: 0, shadowConsecutiveLosses: 0, shadowWinRate: 0, shadowProfitFactor: 0, shadowDrawdownR: 0, minTradesReached: false, winRateOk: false, profitFactorOk: false, drawdownOk: false, consecLossesOk: false, ready: false },
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
  const freeMargin = Number(data.account?.freeMargin || 0);
  const marginLevel = Number(data.account?.marginLevel || 0);
  const checks = [
    ["MT5 terminal", data.terminal?.connected, data.terminal?.connected ? "CONNECTED" : "OFFLINE"],
    ["Feed heartbeat", age <= 10, age <= 10 ? `${age}s AGO` : `${age}s STALE`],
    ["Exness server", data.engine?.exnessVerified, data.engine?.exnessVerified ? "VERIFIED" : "CHECK"],
    ["Algo Trading", data.terminal?.algoTrading, data.terminal?.algoTrading ? "ENABLED" : "DISABLED"],
    ["Emergency stop", !data.engine?.emergencyStop, data.engine?.emergencyStop ? "ACTIVE" : "CLEAR"],
    ["Position protection", positionProtected, positionProtected ? "VERIFIED" : "MISSING"],
    ["Free margin", freeMargin >= 0, freeMargin >= 0 ? money(freeMargin, data.account?.currency || "USD") : `${money(freeMargin, data.account?.currency || "USD")} NEGATIVE`],
    ["Margin defence", !data.risk?.marginDefence?.locked,
      data.risk?.marginDefence?.locked ? data.risk.marginDefence.reason : "CLEAR"],
    ["Margin level", marginLevel === 0 || marginLevel >= Number(data.risk?.marginDefence?.minimumMarginLevel || 150),
      marginLevel === 0 ? "NO MARGIN" : `${number(marginLevel, 1)}%`],
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

function renderOrderBlock(market) {
  const ob = market?.orderBlock || {};
  const mss = ob.mss || {};
  const fvg = ob.fvg || {};
  const statePill = $("#obState");
  const valid = Boolean(ob.valid);
  const side = String(ob.side || "NONE").toUpperCase();
  statePill.textContent = ob.state || "NONE";
  statePill.className = `pill ${valid ? (side === "BUY" ? "healthy" : "danger") : "neutral"}`;

  setText("#mssSide", mss.side || "NONE");
  setText("#mssDetail", Number(mss.time)
    ? `${new Date(Number(mss.time) * 1000).toLocaleString()} · swing ${number(mss.swingPrice)}`
    : "Waiting for a fractal-3 close break");
  setText("#fvgSide", fvg.side || "NONE");
  setText("#fvgDetail", Number(fvg.time)
    ? `${number(fvg.low)}–${number(fvg.high)} · ${new Date(Number(fvg.time) * 1000).toLocaleString()}`
    : "Must complete within three candles");
  setText("#obSide", side);
  setText("#obDetail", Number(ob.time)
    ? `${new Date(Number(ob.time) * 1000).toLocaleString()} · ${ob.required ? "required gate" : "bonus mode"}`
    : "No active zone");
  setText("#obZone", valid ? `${number(ob.low)}–${number(ob.high)}` : "—");
  setText("#obEntry", valid ? number(ob.entry) : "—");
  setText("#obStop", valid ? number(ob.stop) : "—");
  setText("#obTarget", valid ? number(ob.target) : "—");
  setText("#obOrder", ob.pending ? "LIMIT PENDING" : ob.state || "NONE");
  const lifecycle = Array.isArray(ob.lifecycle) ? ob.lifecycle : [];
  $("#obLifecycle").innerHTML = lifecycle.length
    ? lifecycle.map(item => `<b>${escapeHtml(item.event)} · ${new Date(Number(item.time) * 1000).toLocaleTimeString()}</b>`).join("")
    : "<em>No lifecycle events yet</em>";
  const directive = $("#structureDirective");
  const developing = Boolean(Number(mss.time)) && !valid;
  directive.textContent = ob.pending || valid ? "LIMIT READY" : developing ? "SETUP DEVELOPING" : "DO NOT TRADE";
  directive.className = `structure-directive ${ob.pending || valid ? "ready" : developing ? "developing" : "blocked"}`;

  ["#mssSide", "#fvgSide", "#obSide"].forEach(selector => {
    const node = $(selector);
    const value = String(node.textContent || "").toUpperCase();
    node.style.color = value === "BUY" ? "var(--green)" :
      value === "SELL" ? "var(--red)" : "var(--muted)";
  });
}

function renderTradeDirective(data) {
  const market = data.market || {};
  const sessionOpen = Boolean(market.session?.open);
  const stale = Boolean(market.candleStale);
  const marginLocked = Boolean(data.risk?.marginDefence?.locked);
  const ob = market.orderBlock || {};
  const ready = sessionOpen && !stale && !marginLocked && !data.news?.blocked &&
    Boolean(ob.valid) && (Boolean(ob.pending) || ["BUY", "SELL"].includes(String(market.signal || "").toUpperCase()));
  const developing = sessionOpen && !stale && !marginLocked &&
    (Number(ob.mss?.time) > 0 || Number(market.buyChecks) >= 8 || Number(market.sellChecks) >= 8);
  let action = ready ? "LIMIT READY" : developing ? "SETUP DEVELOPING" : "DO NOT TRADE";
  let reason = ready
    ? `Validated ${ob.side || ""} Order Block. Use only the displayed limit, SL and 3R target.`
    : marginLocked ? (data.risk.marginDefence.reason || "Account-wide margin defence is active.")
      : !sessionOpen ? "Market is closed or the broker tick is stale."
        : stale ? "The last completed M30 candle is stale."
          : data.news?.blocked ? "High-impact USD news window blocks new entries."
            : "Wait for MSS, immediate FVG, validated Order Block and aligned factors.";
  setText("#marketSession", market.session?.state || (sessionOpen ? "MARKET OPEN" : "MARKET CLOSED"));
  setText("#tradeAction", action);
  setText("#tradeReason", reason);
  setText("#lastClosedCandle", Number(market.lastClosedBarTime)
    ? `${new Date(Number(market.lastClosedBarTime) * 1000).toLocaleString()}${stale ? " · STALE" : ""}`
    : "Unavailable");
  $("#tradeDirective").className = `trade-directive ${ready ? "ready" : developing ? "developing" : "blocked"}`;
}

function renderAccountPositions(account, currency) {
  const positions = Array.isArray(account?.positions) ? account.positions : [];
  setText("#accountPositionCount", `${positions.length} open`);
  $("#accountPositions").innerHTML = positions.length
    ? positions.map(p => `<div class="exposure-row ${p.guardManaged ? "" : "external"}">
        <span>${escapeHtml(p.symbol)} · ${escapeHtml(p.side)} ${number(p.volume, 2)} lots${p.guardManaged ? " · GUARD" : " · EXTERNAL"}</span>
        <strong>${money(p.profit, currency)}</strong>
        <span>${Number(p.stop) > 0 && Number(p.target) > 0 ? "SL/TP" : "UNPROTECTED"}</span>
      </div>`).join("")
    : "<em>No account-wide exposure</em>";
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
  const activeSignal = String(market?.signal || "WAIT").toUpperCase();
  const labels = [
    ["M30", "h1"], ["H4", "h4"], ["BREAK", "breakout"], ["MOM", "momentum"], ["ADX", "strength"],
    ["VOL%", "volatility"], ["TIME", "timeofday"], ["SLOPE", "emaslope"],
    ["PREV", "prevstrength"], ["M5", "m5confirm"], ["STOCH", "stochastic"], ["TVOL", "tickvol"]
  ];
  const srFactor = factors["sr"] || {};
  const srBuy = Boolean(srFactor.buy);
  const srSell = Boolean(srFactor.sell);
  const srSide = srBuy ? "buy" : srSell ? "sell" : "";
  const strictOB = Boolean(market?.orderBlock?.required);
  const minimum = Number(market?.minimumExecutionChecks || 12);
  const srBadge = `<div class="factor bonus ${srSide}" title="${strictOB ? `MSS/FVG validated Order Block gate · minimum ${minimum}/12` : "Legacy v1.40 Order Block retest bonus"}">${strictOB ? "VOB" : "OB"}${srSide ? ` ${srSide.toUpperCase()}` : " -"}</div>`;
  $("#factorList").innerHTML = labels.map(([label, key]) => {
    const value = factors[key] || {};
    const buy = Boolean(value.buy);
    const sell = Boolean(value.sell);
    let side = "";
    if (activeSignal === "SELL") {
      side = sell ? "sell" : buy ? "buy" : "";
    } else if (activeSignal === "BUY") {
      side = buy ? "buy" : sell ? "sell" : "";
    } else {
      side = buy ? "buy" : sell ? "sell" : "";
    }
    return `<div class="factor ${side}">${label}${side ? ` ${side.toUpperCase()}` : " WAIT"}</div>`;
  }).join("") + srBadge;
  updateCountdown(market?.nextBarTime);
}

function supportResistanceLevels(candles) {
  const closed = candles.length > 1 ? candles.slice(0, -1) : candles;
  const window = closed.slice(-20);
  if (window.length < 2) return null;
  const support = Math.min(...window.map(c => Number(c.low)));
  const resistance = Math.max(...window.map(c => Number(c.high)));
  if (!Number.isFinite(support) || !Number.isFinite(resistance) || support >= resistance) {
    return null;
  }
  return { support, resistance };
}

function liveSupportResistance(market, candles) {
  const structure = market?.structure;
  if (Number.isFinite(Number(structure?.support)) && Number.isFinite(Number(structure?.resistance))) {
    return {
      support: Number(structure.support),
      resistance: Number(structure.resistance),
      source: `EA live structure · ${structure.window || ""} bars`
    };
  }
  const fallback = supportResistanceLevels(candles);
  return fallback ? { ...fallback, source: "Dashboard candle fallback" } : null;
}

function updateCountdown(nextBarTime) {
  const remaining = Math.max(0, Number(nextBarTime || 0) - Math.floor(Date.now() / 1000));
  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  setText("#nextH1", nextBarTime ? `NEXT 30M ${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}` : "NEXT 30M --:--");
}

function renderShadow(shadow, currency) {
  const value = shadow || {};
  const stats = value.stats || {};
  const open = Boolean(value.open);
  const pending = Boolean(value.pending);
  const statePill = $("#shadowState");
  statePill.textContent = !value.enabled ? "DISABLED" : pending ? `${value.side || "OB"} LIMIT` : open ? `${value.side || "OPEN"} PAPER` : "FLAT";
  statePill.className = `pill ${open || pending ? (value.side === "SELL" ? "danger" : "healthy") : "neutral"}`;
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

function renderValidation(validation) {
  const value = validation || {};
  const statePill = $("#validationState");
  if (!statePill) return;
  statePill.textContent = value.ready ? "GO" : "NO-GO";
  statePill.className = `pill ${value.ready ? "healthy" : "danger"}`;
  setText("#validationSummary", `${number(value.shadowWinRate, 1)}% WR · ${number(value.shadowProfitFactor, 2)} PF · ${number(value.shadowDrawdownR, 3)}R DD`);
  setText("#validationDetail", value.ready
    ? "Forward validation gates passed on the shadow run."
    : `Trades ${value.shadowTrades || 0}/50 · Loss streak ${value.shadowConsecutiveLosses || 0}/4 · Win rate ${value.winRateOk ? "OK" : "pending"} · PF ${value.profitFactorOk ? "OK" : "pending"}`);
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

function render(data, live = false) {
  state.lastData = data;
  const currency = data.account?.currency || "USD";
  const age = Math.max(0, Math.floor(Date.now() / 1000 - Number(data.heartbeat || 0)));
  const fresh = age <= 10;

  if (live) {
    setConnection(fresh ? "live" : "stale", fresh ? "MT5 LIVE" : "MT5 FEED STALE");
    setText("#noticeTitle", fresh ? "Live MT5 feed connected" : "Feed heartbeat is stale");
    setText("#noticeText", fresh ? "Monitoring the selected file every two seconds." : "Confirm MT5 and the EA are still running.");
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
  const trend = String(data.market?.trend || "WAIT").toUpperCase();
  const trendPrevious = String(data.market?.trendPrevious || "WAIT").toUpperCase();
  const trendReversal = Boolean(data.market?.trendReversal);
  const trendExitWarning = Boolean(data.market?.trendExitWarning);
  const trendExitState = String(data.market?.trendExitState || "NONE").toUpperCase();
  const trendExitReason = String(data.market?.trendExitReason || "");
  const buyChecks = Number(data.market?.buyChecks ?? 0);
  const sellChecks = Number(data.market?.sellChecks ?? 0);
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
  setText("#trendBias", trend);
  setText("#buyChecks", `${Number.isFinite(buyChecks) ? buyChecks : 0}/12`);
  setText("#sellChecks", `${Number.isFinite(sellChecks) ? sellChecks : 0}/12`);
  const reversalPill = $("#trendReversal");
  if (reversalPill) {
    if (trendReversal) {
      reversalPill.textContent = `TREND REVERSAL: ${trendPrevious} -> ${trend}`;
      reversalPill.className = `engine-reversal ${trend === "BUY" ? "reversal-buy" : "reversal-sell"}`;
    } else {
      reversalPill.textContent = `Trend reversal: ${trendPrevious === "WAIT" || trend === "WAIT" ? "waiting" : "no change"}`;
      reversalPill.className = "engine-reversal";
    }
  }
  const warningPill = $("#trendExitWarning");
  if (warningPill) {
    if (trendExitWarning) {
      warningPill.textContent = `${trendExitState === "NOW" ? "EXIT NOW" : "EXIT WATCH"}: ${trendExitReason || "close to reversal"}`;
      warningPill.className = `engine-warning ${trendExitState === "NOW" ? "danger" : "warn"}`;
    } else {
      warningPill.textContent = "Exit warning: none";
      warningPill.className = "engine-warning";
    }
  }
  $("#trendBias").style.color = trend === "BUY" ? "var(--green)" : trend === "SELL" ? "var(--red)" : "var(--muted)";
  $("#buyChecks").style.color = "var(--green)";
  $("#sellChecks").style.color = "var(--red)";
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
  const riskDanger = dailyRatio >= 100 || drawdownRatio >= 100 || Boolean(data.risk?.marginDefence?.locked);
  const riskState = $("#riskState");
  riskState.textContent = riskDanger ? "LIMIT REACHED" : dailyRatio >= 70 || drawdownRatio >= 70 ? "WATCH" : "HEALTHY";
  riskState.className = `pill ${riskDanger ? "danger" : dailyRatio >= 70 || drawdownRatio >= 70 ? "locked" : "healthy"}`;

  renderPosition(data.position, currency);
  renderAccountPositions(data.account, currency);
  renderTradeDirective(data);
  renderShadow(data.shadow, currency);
  renderValidation(data.validation);
  renderExecution(data.execution);
  renderHealth(data, age);
  renderAlerts(data);
  renderNews(data);
  renderOrderBlock(data.market);
  drawChart(data.candles || []);
}

function drawChart(candles) {
  const canvas = $("#chart");
  const themeStyles = getComputedStyle(document.documentElement);
  const themeGreen = themeStyles.getPropertyValue("--green").trim() || "#43f29a";
  const themeRed = themeStyles.getPropertyValue("--red").trim() || "#ff6b72";
  const themeGold = themeStyles.getPropertyValue("--gold").trim() || "#e7bd6a";
  const themeMuted = themeStyles.getPropertyValue("--muted").trim() || "#82968c";
  const isLightTheme = document.documentElement.dataset.theme === "light";
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
  const orderBlock = state.lastData?.market?.orderBlock || {};
  const extraLevels = [];
  if (orderBlock.valid) {
    extraLevels.push(Number(orderBlock.low), Number(orderBlock.high),
      Number(orderBlock.entry), Number(orderBlock.stop), Number(orderBlock.target));
  }
  if (Number(orderBlock.fvg?.low) && Number(orderBlock.fvg?.high)) {
    extraLevels.push(Number(orderBlock.fvg.low), Number(orderBlock.fvg.high));
  }
  const finiteExtra = extraLevels.filter(Number.isFinite);
  const high = Math.max(...visible.map(c => Number(c.high)), ...finiteExtra);
  const low = Math.min(...visible.map(c => Number(c.low)), ...finiteExtra);
  const range = Math.max(.001, high - low);
  const pad = { top: 14, right: 55, bottom: 20, left: 4 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;
  const y = value => pad.top + (high - value) / range * plotH;
  const levels = liveSupportResistance(state.lastData?.market, visible);

  function drawLevel(value, label, stroke, fill) {
    const yy = y(value);
    if (!Number.isFinite(yy)) return;
    ctx.save();
    ctx.strokeStyle = stroke;
    ctx.fillStyle = fill;
    ctx.setLineDash([8, 5]);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(pad.left, yy);
    ctx.lineTo(width - pad.right, yy);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.font = "10px ui-monospace, monospace";
    const text = `${label} ${value.toFixed(2)}`;
    const textWidth = ctx.measureText(text).width;
    const boxW = textWidth + 10;
    const boxH = 16;
    const boxX = width - pad.right - boxW - 2;
    const boxY = yy - boxH / 2;
    ctx.fillStyle = isLightTheme ? "rgba(255,255,255,.94)" : "rgba(7,16,13,.92)";
    ctx.fillRect(boxX, boxY, boxW, boxH);
    ctx.strokeStyle = stroke;
    ctx.strokeRect(boxX, boxY, boxW, boxH);
    ctx.fillStyle = fill;
    ctx.fillText(text, boxX + 5, yy + 3);
    ctx.restore();
  }

  ctx.strokeStyle = isLightTheme ? "rgba(26,76,54,.12)" : "rgba(146,178,161,.10)";
  ctx.lineWidth = 1;
  ctx.fillStyle = themeMuted;
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
  const xForTime = timestamp => {
    const target = Number(timestamp || 0);
    let index = visible.findIndex(c => Number(c.time) >= target);
    if (index < 0) index = 0;
    return pad.left + slot * index;
  };

  if (orderBlock.valid) {
    const zoneX = xForTime(orderBlock.time);
    const zoneTop = y(Number(orderBlock.high));
    const zoneBottom = y(Number(orderBlock.low));
    ctx.fillStyle = orderBlock.side === "SELL"
      ? "rgba(255,107,114,.14)" : "rgba(67,242,154,.14)";
    ctx.strokeStyle = orderBlock.side === "SELL"
      ? "rgba(255,107,114,.65)" : "rgba(67,242,154,.65)";
    ctx.fillRect(zoneX, zoneTop, width - pad.right - zoneX,
      Math.max(1, zoneBottom - zoneTop));
    ctx.strokeRect(zoneX, zoneTop, width - pad.right - zoneX,
      Math.max(1, zoneBottom - zoneTop));
  }

  if (Number(orderBlock.fvg?.low) && Number(orderBlock.fvg?.high)) {
    const gapX = xForTime(orderBlock.fvg.time);
    const gapTop = y(Number(orderBlock.fvg.high));
    const gapBottom = y(Number(orderBlock.fvg.low));
    ctx.fillStyle = "rgba(98,168,255,.10)";
    ctx.strokeStyle = "rgba(98,168,255,.5)";
    ctx.fillRect(gapX, gapTop, width - pad.right - gapX,
      Math.max(1, gapBottom - gapTop));
    ctx.strokeRect(gapX, gapTop, width - pad.right - gapX,
      Math.max(1, gapBottom - gapTop));
  }

  visible.forEach((candle, index) => {
    const x = pad.left + slot * index + slot / 2;
    const open = y(Number(candle.open));
    const close = y(Number(candle.close));
    const up = Number(candle.close) >= Number(candle.open);
    ctx.strokeStyle = up ? themeGreen : themeRed;
    ctx.fillStyle = up ? themeGreen : themeRed;
    ctx.beginPath();
    ctx.moveTo(x, y(Number(candle.high)));
    ctx.lineTo(x, y(Number(candle.low)));
    ctx.stroke();
    ctx.fillRect(x - bodyW / 2, Math.min(open, close), bodyW, Math.max(1, Math.abs(close - open)));
  });

  function drawMarker(timestamp, price, label, color, above = true) {
    if (!Number(timestamp) || !Number.isFinite(Number(price))) return;
    const x = xForTime(timestamp);
    const yy = y(Number(price));
    ctx.save();
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.moveTo(x, yy);
    ctx.lineTo(x - 4, yy + (above ? -7 : 7));
    ctx.lineTo(x + 4, yy + (above ? -7 : 7));
    ctx.closePath();
    ctx.fill();
    ctx.font = "700 9px ui-monospace, monospace";
    ctx.fillText(label, Math.max(2, x + 5), yy + (above ? -6 : 12));
    ctx.restore();
  }

  const structure = state.lastData?.market?.structure || {};
  drawMarker(structure.supportTime, structure.support, "CONF S", themeGreen, false);
  drawMarker(structure.resistanceTime, structure.resistance, "CONF R", themeRed, true);
  drawMarker(orderBlock.time, orderBlock.side === "SELL" ? orderBlock.high : orderBlock.low,
    "OB", orderBlock.side === "SELL" ? themeRed : themeGreen, orderBlock.side === "SELL");
  drawMarker(orderBlock.fvg?.time, orderBlock.fvg?.high, "FVG", "#62a8ff", true);
  drawMarker(orderBlock.mss?.time, orderBlock.mss?.swingPrice, "MSS", themeGold,
    orderBlock.mss?.side === "SELL");
  drawMarker(orderBlock.invalidationTime,
    orderBlock.side === "SELL" ? orderBlock.high : orderBlock.low,
    orderBlock.state === "EXPIRED" ? "EXPIRED" : "INVALID",
    themeRed, true);

  if (levels) {
    drawLevel(levels.support, `SUPPORT${levels.source ? "" : ""}`, themeGreen, themeGreen);
    drawLevel(levels.resistance, `RESIST${levels.source ? "" : ""}`, themeRed, themeRed);
  }
  if (orderBlock.valid) {
    drawLevel(Number(orderBlock.entry), "OB ENTRY", themeGold, themeGold);
    drawLevel(Number(orderBlock.stop), "OB SL", themeRed, themeRed);
    drawLevel(Number(orderBlock.target), "OB 3R", themeGreen, themeGreen);
  }
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
    if (Number(data.schema) < 1 || Number(data.schema) > 3) throw new Error("Unsupported dashboard schema");
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

async function fetchJsonFrom(urls) {
  let lastError = null;
  for (const url of urls) {
    try {
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error("Unable to fetch JSON");
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
    if (error.name !== "AbortError") console.error(error);
  }
}

async function fetchLive() {
  try {
    const data = await fetchJsonFrom(LIVE_ENDPOINTS);
    if (Number(data.schema) < 1 || Number(data.schema) > 3) throw new Error("Unsupported schema");
    state.live = true;
    render(data, true);
    return true;
  } catch {
    return false;
  }
}

async function restoreConnection() {
  // Always try HTTP server first (works on any refresh with no prompts)
  const ok = await fetchLive();
  if (ok) {
    clearInterval(state.timer);
    state.timer = setInterval(fetchLive, 2000);
    return;
  }

  // Fallback: try saved file handle from IndexedDB (file:// mode)
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

// ── Signal History ────────────────────────────────────────────────────
async function loadHistory() {
  try {
    const h = await fetchJsonFrom(HISTORY_ENDPOINTS);
    renderHistory(h);
  } catch {
    // not served via HTTP — history requires the local dashboard server
  }
}

function renderHistory(h) {
  state.history = h;
  const s = h.summary || {};
  const signals = h.signals || [];
  const closed = s.closed || 0;

  setText("#hTotal", `${s.total_signals || 0} (${closed} closed)`);
  setText("#hWinRate", closed ? `${s.win_rate_pct}%` : "--%");
  setText("#hPF", closed ? s.profit_factor : "--");
  setText("#hNetR", closed ? `${s.net_r}R` : "--");
  setText("#hConsec", closed ? s.max_consec_losses : "--");
  setText("#hDD", closed ? `${s.max_drawdown_r}R` : "--");

  // Validation gates
  const gates = [
    { label: "Win rate ≥55%", ok: s.validation?.win_rate_ok, pending: !closed },
    { label: "Profit factor ≥1.8", ok: s.validation?.profit_factor_ok, pending: !closed },
    { label: "Max consec losses ≤4", ok: s.validation?.consec_losses_ok, pending: !closed },
    { label: `≥50 trades (${closed}/50)`, ok: s.validation?.min_trades_reached, pending: closed < 50 },
  ];
  $("#historyGates").innerHTML = gates.map(g => {
    const cls = g.pending ? "pending" : g.ok ? "pass" : "fail";
    const icon = g.pending ? "○" : g.ok ? "✓" : "✗";
    return `<div class="gate ${cls}">${icon} ${g.label}</div>`;
  }).join("");
  const tiers = s.score_tiers || {};
  $("#scoreTiers").innerHTML = [9, 10, 11, 12].map(score => {
    const tier = tiers[String(score)] || {};
    const closedCount = Number(tier.closed || 0);
    return `<div><span>${score}/12 SCORE</span><strong>${closedCount} trade${closedCount === 1 ? "" : "s"} · ${closedCount ? `${number(tier.win_rate_pct, 1)}% WR` : "collecting"}</strong><small>PF ${closedCount ? number(tier.profit_factor, 2) : "--"} · ${closedCount ? number(tier.net_r, 2) : "0.00"}R</small></div>`;
  }).join("");

  const pill = $("#historyState");
  if (!closed) {
    pill.textContent = "COLLECTING"; pill.className = "pill neutral";
  } else if (Object.values(s.validation || {}).every(Boolean)) {
    pill.textContent = "PASSING"; pill.className = "pill healthy";
  } else {
    pill.textContent = `${Object.values(s.validation || {}).filter(Boolean).length}/4 GATES`; pill.className = "pill locked";
  }

  // Table rows
  const tbody = $("#historyBody");
  if (!signals.length) return;
  tbody.innerHTML = signals.map(sig => {
    const isOpen = sig.status === "OPEN";
    const isWin = sig.outcome === "TARGET";
    const rowCls = isOpen ? "open-row" : "";
    const outcomePill = isOpen
      ? `<span class="pill-open">OPEN</span>`
      : isWin
        ? `<span class="pill-win">TARGET</span>`
        : `<span class="pill-loss">STOP</span>`;
    const resultCls = isOpen ? "" : (isWin ? "win" : "loss");
    const checks = `${sig.signal_score ?? (sig.side === "BUY" ? sig.buy_checks_at_open : sig.sell_checks_at_open)}/12 ${sig.side}`;
    return `<tr class="${rowCls}">
      <td>${escapeHtml(sig.id)}</td>
      <td>${escapeHtml(sig.open_time_str || "--")}</td>
      <td>${escapeHtml(sig.side)}</td>
      <td>${Number(sig.entry).toFixed(3)}</td>
      <td>${Number(sig.sl).toFixed(3)}</td>
      <td>${Number(sig.tp).toFixed(3)}</td>
      <td>${checks}</td>
      <td>${outcomePill}</td>
      <td class="${resultCls}">${sig.result_r !== null ? `${Number(sig.result_r).toFixed(2)}R` : "--"}</td>
      <td>${sig.mfe_r !== null ? `${Number(sig.mfe_r).toFixed(2)}R` : "--"}</td>
      <td>${sig.mae_r !== null ? `${Number(sig.mae_r).toFixed(2)}R` : "--"}</td>
      <td>${sig.duration_hours !== null ? `${sig.duration_hours}h` : "active"}</td>
      <td>${escapeHtml(sig.status)}</td>
    </tr>`;
  }).join("");
}

function csvCell(value) {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

function downloadCsv(filename, rows) {
  const blob = new Blob([rows.map(row => row.map(csvCell).join(",")).join("\r\n")],
    { type: "text/csv;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

$("#downloadTrades")?.addEventListener("click", () => {
  const signals = state.history?.signals || [];
  downloadCsv("exness-guard-forward-trades.csv", [
    ["id", "opened", "side", "signal_score", "entry", "stop", "target", "buy_checks", "sell_checks",
      "outcome", "result_r", "mfe_r", "mae_r", "duration_hours", "status"],
    ...signals.map(s => [s.id, s.open_time_str, s.side, s.signal_score, s.entry, s.sl, s.tp,
      s.buy_checks_at_open, s.sell_checks_at_open, s.outcome, s.result_r,
      s.mfe_r, s.mae_r, s.duration_hours, s.status])
  ]);
});

$("#downloadWeekly")?.addEventListener("click", () => {
  const signals = (state.history?.signals || []).filter(s => s.open_time_str);
  const weeks = new Map();
  for (const s of signals) {
    const normalizedTime = String(s.open_time_str)
      .replace(/^(\d{4})\.(\d{2})\.(\d{2})\s+/, "$1-$2-$3T");
    const date = new Date(normalizedTime);
    if (Number.isNaN(date.getTime())) continue;
    const monday = new Date(date);
    const day = (monday.getDay() + 6) % 7;
    monday.setDate(monday.getDate() - day);
    const key = monday.toISOString().slice(0, 10);
    const item = weeks.get(key) || { trades: 0, closed: 0, wins: 0, netR: 0 };
    item.trades++;
    if (s.result_r !== null && s.result_r !== undefined) {
      item.closed++;
      item.netR += Number(s.result_r) || 0;
      if (Number(s.result_r) > 0) item.wins++;
    }
    weeks.set(key, item);
  }
  downloadCsv("exness-guard-weekly-summary.csv", [
    ["week_start", "signals", "closed", "wins", "win_rate_pct", "net_r"],
    ...[...weeks.entries()].sort().map(([week, x]) => [
      week, x.trades, x.closed, x.wins,
      x.closed ? (x.wins / x.closed * 100).toFixed(2) : "",
      x.netR.toFixed(2)
    ])
  ]);
});

loadHistory();
setInterval(loadHistory, 30000);  // refresh history every 30 seconds
