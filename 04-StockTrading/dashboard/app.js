const $ = (selector) => document.querySelector(selector);
const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const number = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });
const scan = window.STOCK_FORGE_SCAN;

function setText(selector, value) {
  const element = $(selector);
  if (element) element.textContent = value ?? "—";
}

function observedFixedHoliday(year, month, day) {
  const value = new Date(Date.UTC(year, month - 1, day));
  const weekday = value.getUTCDay();
  if (weekday === 6) value.setUTCDate(value.getUTCDate() - 1);
  if (weekday === 0) value.setUTCDate(value.getUTCDate() + 1);
  return value.toISOString().slice(0, 10);
}

function nthWeekday(year, month, weekday, occurrence) {
  const first = new Date(Date.UTC(year, month - 1, 1));
  const offset = (weekday - first.getUTCDay() + 7) % 7;
  return new Date(Date.UTC(year, month - 1, 1 + offset + (occurrence - 1) * 7))
    .toISOString().slice(0, 10);
}

function lastWeekday(year, month, weekday) {
  const last = new Date(Date.UTC(year, month, 0));
  last.setUTCDate(last.getUTCDate() - ((last.getUTCDay() - weekday + 7) % 7));
  return last.toISOString().slice(0, 10);
}

function easterSunday(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(year, month - 1, day));
}

function nyseHolidays(year) {
  const holidays = new Map();
  const add = (date, name) => holidays.set(date, name);
  add(observedFixedHoliday(year, 1, 1), "New Year's Day");
  // Include the following New Year when it is observed on December 31.
  add(observedFixedHoliday(year + 1, 1, 1), "New Year's Day");
  add(nthWeekday(year, 1, 1, 3), "Martin Luther King Jr. Day");
  add(nthWeekday(year, 2, 1, 3), "Presidents Day");
  const goodFriday = easterSunday(year);
  goodFriday.setUTCDate(goodFriday.getUTCDate() - 2);
  add(goodFriday.toISOString().slice(0, 10), "Good Friday");
  add(lastWeekday(year, 5, 1), "Memorial Day");
  add(observedFixedHoliday(year, 6, 19), "Juneteenth");
  add(observedFixedHoliday(year, 7, 4), "Independence Day");
  add(nthWeekday(year, 9, 1, 1), "Labor Day");
  add(nthWeekday(year, 11, 4, 4), "Thanksgiving Day");
  add(observedFixedHoliday(year, 12, 25), "Christmas Day");
  return holidays;
}

function easternClockParts(now) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  });
  return Object.fromEntries(
    formatter.formatToParts(now)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)])
  );
}

function usMarketStatus(now = new Date()) {
  const parts = easternClockParts(now);
  const date = `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
  const weekday = new Date(Date.UTC(parts.year, parts.month - 1, parts.day)).getUTCDay();
  const holiday = nyseHolidays(parts.year).get(date);
  const minutes = parts.hour * 60 + parts.minute;
  if (weekday === 0 || weekday === 6) {
    return { open: false, detail: "Closed: weekend" };
  }
  if (holiday) {
    return { open: false, detail: `Closed: ${holiday}` };
  }
  const thanksgiving = nthWeekday(parts.year, 11, 4, 4);
  const thanksgivingDate = new Date(`${thanksgiving}T00:00:00Z`);
  thanksgivingDate.setUTCDate(thanksgivingDate.getUTCDate() + 1);
  const dayAfterThanksgiving = thanksgivingDate.toISOString().slice(0, 10);
  const earlyClose = date === dayAfterThanksgiving ||
    (parts.month === 12 && parts.day === 24) ||
    (parts.month === 7 && parts.day === 3);
  const closeMinutes = earlyClose ? 13 * 60 : 16 * 60;
  if (minutes >= 9 * 60 + 30 && minutes < closeMinutes) {
    return {
      open: true,
      detail: earlyClose
        ? "NYSE regular session open; scheduled 1:00 PM ET close"
        : "NYSE regular session open until 4:00 PM ET"
    };
  }
  return {
    open: false,
    detail: minutes < 9 * 60 + 30
      ? "Closed: pre-market; regular session starts 9:30 AM ET"
      : `Closed: regular session ended ${earlyClose ? "1:00" : "4:00"} PM ET`
  };
}

window.stockForgeMarketStatus = usMarketStatus;

function updateMarketStatus() {
  const status = usMarketStatus();
  const element = $("#us-market-status");
  if (!element) return;
  element.textContent = status.open ? "US MARKET OPEN" : "US MARKET CLOSED";
  element.className = `pill ${status.open ? "market-open" : "market-closed"}`;
  element.title = `${status.detail}. Scheduled NYSE status; emergency halts are not detected.`;
}

function updateClock() {
  setText("#clock", new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "medium"
  }).format(new Date()));
  updateMarketStatus();
}

function addFactor(container, label, value) {
  const row = document.createElement("div");
  row.className = "factor-row";
  const heading = document.createElement("div");
  const name = document.createElement("span");
  const score = document.createElement("b");
  name.textContent = label;
  score.textContent = value == null ? "N/A" : number.format(value);
  heading.append(name, score);
  const track = document.createElement("div");
  track.className = "factor-track";
  const fill = document.createElement("div");
  fill.className = "factor-fill";
  fill.style.width = value == null ? "0%" : `${Math.max(0, Math.min(100, value))}%`;
  track.append(fill);
  row.append(heading, track);
  container.append(row);
}

function readinessStorageKey(result) {
  return `stockforge-readiness:${result.symbol}:${result.asOf}`;
}

function loadManualReadiness(result) {
  try {
    return JSON.parse(localStorage.getItem(readinessStorageKey(result)) || "{}");
  } catch {
    return {};
  }
}

function saveManualReadiness(result, state) {
  try {
    localStorage.setItem(readinessStorageKey(result), JSON.stringify(state));
  } catch {
    // The checklist still works for this page load when browser storage is blocked.
  }
}

function renderTradeReadiness(result) {
  const gate = result.tradeReadiness || {
    automaticPassed: false,
    automaticChecks: [],
    manualChecks: []
  };
  const manualState = loadManualReadiness(result);
  const list = $("#readiness-list");
  list.replaceChildren();

  gate.automaticChecks.forEach((check) => {
    const item = document.createElement("div");
    item.className = `readiness-check ${check.passed ? "pass" : "fail"}`;
    const text = document.createElement("span");
    text.textContent = check.label;
    const state = document.createElement("b");
    state.className = "check-state";
    state.textContent = check.passed ? "PASS" : "FAIL";
    item.append(text, state);
    if (check.detail) {
      const detail = document.createElement("small");
      detail.textContent = check.detail;
      item.append(detail);
    }
    list.append(item);
  });

  const updateSummary = () => {
    const automaticPassedCount = gate.automaticChecks.filter((check) => check.passed).length;
    const manualPassedCount = gate.manualChecks.filter((check) => manualState[check.id]).length;
    const total = gate.automaticChecks.length + gate.manualChecks.length;
    const passed = automaticPassedCount + manualPassedCount;
    const ready = gate.automaticPassed && manualPassedCount === gate.manualChecks.length;
    setText("#readiness-count", `${passed} / ${total}`);
    const status = $("#readiness-status");
    status.textContent = ready ? "PAPER BUY SETUP" : "NO TRADE";
    status.className = ready ? "ready" : "";
  };

  gate.manualChecks.forEach((check) => {
    const label = document.createElement("label");
    label.className = "readiness-check manual";
    const input = document.createElement("input");
    input.type = "checkbox";
    input.checked = Boolean(manualState[check.id]);
    input.addEventListener("change", () => {
      manualState[check.id] = input.checked;
      saveManualReadiness(result, manualState);
      updateSummary();
    });
    const text = document.createElement("span");
    text.textContent = check.label;
    const state = document.createElement("b");
    state.className = "check-state";
    const updateManualState = () => {
      state.textContent = input.checked ? "CONFIRMED" : "UNCONFIRMED";
      label.classList.toggle("pass", input.checked);
    };
    updateManualState();
    input.addEventListener("change", updateManualState);
    label.append(input, text, state);
    list.append(label);
  });
  updateSummary();
}

function renderMarketEvidence(result) {
  const evidence = result.marketEvidence || {};
  const earnings = evidence.earnings || {};
  const news = evidence.news || {};
  setText("#evidence-earnings", earnings.available
    ? earnings.nextEarningsDate || "None in provider horizon"
    : "UNAVAILABLE");
  setText("#evidence-window", earnings.available
    ? `${earnings.windowStart} to ${earnings.windowEnd}`
    : "N/A");
  setText("#evidence-articles", news.available ? number.format(news.articleCount || 0) : "UNAVAILABLE");
  setText("#evidence-adverse", news.available ? number.format(news.adverseCount || 0) : "N/A");
  setText("#evidence-checked", evidence.checkedAt
    ? new Date(evidence.checkedAt).toLocaleString()
    : "N/A");
  const list = $("#evidence-headlines");
  list.replaceChildren();
  const headlines = Array.isArray(news.headlines) ? news.headlines : [];
  if (!headlines.length) {
    const item = document.createElement("li");
    item.textContent = news.available
      ? "No relevant post-session articles returned by the provider."
      : news.reason || "No automated news evidence loaded.";
    list.append(item);
    return;
  }
  headlines.slice(0, 5).forEach((headline) => {
    const item = document.createElement("li");
    const link = document.createElement("a");
    link.textContent = `${headline.adverse ? "FLAG · " : ""}${headline.title}`;
    if (/^https?:\/\//.test(headline.url || "")) {
      link.href = headline.url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
    }
    item.className = headline.adverse ? "headline-adverse" : "";
    item.append(link);
    list.append(item);
  });
}

function showDetail(result, row) {
  document.querySelectorAll("tbody tr").forEach((item) => item.classList.remove("selected"));
  if (row) row.classList.add("selected");

  setText("#detail-symbol", `${result.symbol} · ${result.name || result.symbol}`);
  setText("#detail-score", number.format(result.score));
  const factorList = $("#factor-list");
  factorList.replaceChildren();
  const labels = {
    technical: "Technical",
    fundamental: "Fundamental",
    riskQuality: "Risk quality",
    sentiment: "News sentiment",
    marketRegime: "Market regime"
  };
  Object.entries(result.componentScores).forEach(([key, value]) => addFactor(factorList, labels[key] || key, value));
  renderTradeReadiness(result);
  renderMarketEvidence(result);

  setText("#risk-direction", result.riskPlan.direction || "LONG ONLY");
  setText("#risk-shares", number.format(result.riskPlan.suggestedShares));
  setText("#risk-stop", money.format(result.riskPlan.initialStop));
  setText("#risk-target", money.format(result.riskPlan.provisionalTwoRTarget));
  setText("#risk-position", money.format(result.riskPlan.estimatedPositionValue));
  setText("#risk-budget", money.format(result.riskPlan.riskBudget));
  const metrics = result.metrics || {};
  const percent = (value) => value == null ? "N/A" : `${number.format(value)}%`;
  setText("#fund-revenue", percent(metrics.revenueGrowthPercent));
  setText("#fund-operating", percent(metrics.operatingMarginPercent));
  setText("#fund-fcf", percent(metrics.freeCashFlowMarginPercent));
  setText("#fund-leverage", percent(metrics.liabilitiesToAssetsPercent));
  setText("#fund-filed", metrics.fundamentalsFiled || "N/A");
  setText("#fund-year", metrics.fiscalYear || "N/A");

  const reasons = $("#reason-list");
  reasons.replaceChildren();
  result.reasons.forEach((reason) => {
    const item = document.createElement("li");
    item.textContent = reason;
    reasons.append(item);
  });
  setText("#data-asof", `${result.symbol} data as of ${result.asOf} · ${result.dataSource}`);
}

function renderHistory(history) {
  const stats = history?.statistics || {};
  const trades = Array.isArray(history?.closedTrades) ? history.closedTrades : [];
  setText("#history-source", history?.source || "No execution journal");
  setText("#history-count", number.format(stats.closedTradeCount || 0));
  setText("#history-win-rate", stats.winRatePercent == null ? "N/A" : `${number.format(stats.winRatePercent)}%`);
  setText("#history-pnl", money.format(stats.realizedPnl || 0));
  setText("#history-average", stats.averageTradePnl == null ? "N/A" : money.format(stats.averageTradePnl));
  const pnl = $("#history-pnl");
  pnl.className = (stats.realizedPnl || 0) >= 0 ? "safe" : "unsafe";

  const body = $("#history-body");
  body.replaceChildren();
  if (!trades.length) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 8;
    cell.className = "empty";
    cell.textContent = "No closed paper trades recorded.";
    row.append(cell);
    body.append(row);
    return;
  }
  trades.slice(0, 100).forEach((trade) => {
    const row = document.createElement("tr");
    const values = [
      trade.exitTime,
      trade.symbol,
      number.format(trade.quantity),
      money.format(trade.entryPrice),
      money.format(trade.exitPrice),
      money.format(trade.commission),
      money.format(trade.realizedPnl),
      `${number.format(trade.returnPercent)}%`
    ];
    values.forEach((value, index) => {
      const cell = document.createElement("td");
      cell.textContent = value;
      if (index === 1) cell.className = "symbol-cell";
      if (index === 6) cell.className = trade.realizedPnl >= 0 ? "safe" : "unsafe";
      row.append(cell);
    });
    body.append(row);
  });
}

function renderScan(data) {
  const results = Array.isArray(data.results) ? data.results : [];
  const eligible = results.find((item) => item.eligible);
  const state = $("#data-state");
  state.textContent = data.provider.includes("SYNTHETIC") ? "SYNTHETIC DEMO" : "SCAN LOADED";
  state.className = data.provider.includes("SYNTHETIC") ? "pill warning" : "pill live";

  setText("#market-regime", String(data.marketRegime).toUpperCase());
  setText("#provider", data.provider);
  setText("#universe-size", `${results.length} STOCKS`);
  setText("#routing", data.orderRoutingEnabled ? "ENABLED" : "DISABLED");
  $("#routing").className = data.orderRoutingEnabled ? "unsafe" : "safe";
  setText("#generated-at", `Generated ${new Date(data.generatedAt).toLocaleString()}`);

  if (eligible) {
    setText("#leader-symbol", eligible.symbol);
    setText("#leader-name", eligible.name || eligible.symbol);
    setText("#leader-score", number.format(eligible.score));
    setText("#leader-price", money.format(eligible.price));
    setText("#leader-summary", data.recommendationMeaning);
  } else {
    setText("#leader-symbol", "NONE");
    setText("#leader-name", "No eligible company");
    setText("#leader-score", "—");
    setText("#leader-price", "—");
    setText("#leader-summary", data.recommendationMeaning);
  }

  const body = $("#ranking-body");
  body.replaceChildren();
  results.forEach((result, index) => {
    const row = document.createElement("tr");
    const values = [
      result.rank,
      result.symbol,
      result.name || result.symbol,
      number.format(result.score),
      money.format(result.price),
      number.format(result.componentScores.technical),
      result.componentScores.fundamental == null ? "N/A" : number.format(result.componentScores.fundamental),
      number.format(result.componentScores.riskQuality)
    ];
    values.forEach((value, column) => {
      const cell = document.createElement("td");
      cell.textContent = value;
      if (column === 1) cell.className = "symbol-cell";
      if (column === 3) cell.className = "score-cell";
      row.append(cell);
    });
    const status = document.createElement("td");
    const tag = document.createElement("span");
    const automaticReady = Boolean(result.tradeReadiness?.automaticPassed);
    tag.className = automaticReady || result.eligible ? "tag pass" : "tag watch";
    tag.textContent = automaticReady ? "BUY SETUP" : result.eligible ? "SCREEN PASS" : "WATCH";
    status.append(tag);
    row.append(status);
    row.addEventListener("click", () => showDetail(result, row));
    body.append(row);
    if (index === 0) showDetail(result, row);
  });
  renderHistory(data.tradingHistory);
}

updateClock();
setInterval(updateClock, 1000);
if (scan) renderScan(scan);
