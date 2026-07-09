"use strict";

const TICK_SIZE = 0.25;
const POINT_VALUE = 5;
const gates = [
  ["Contract specifications", "documented", true],
  ["Risk policy", "drafted", true],
  ["NinjaTrader 8 platform", "detected", true],
  ["Genuine CME feed", "required", false],
  ["Contract rollover map", "required", false],
  ["Exchange calendar", "required", false],
  ["Paper validation", "60–90 days", false]
];

const gateList = document.querySelector("#gateList");
gateList.innerHTML = gates.map(([name, state, done]) => `
  <div class="gate ${done ? "done" : ""}">
    <i>${done ? "✓" : "·"}</i><span>${name}</span><small>${state}</small>
  </div>`).join("");

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2
});

function calculateRisk() {
  const equity = Math.max(0, Number(document.querySelector("#equityInput").value) || 0);
  const riskPercent = Math.max(0, Number(document.querySelector("#riskInput").value) || 0);
  const rawStop = Math.max(TICK_SIZE, Number(document.querySelector("#stopInput").value) || TICK_SIZE);
  const stopPoints = Math.ceil(rawStop / TICK_SIZE) * TICK_SIZE;
  const budget = equity * riskPercent / 100;
  const contractRisk = stopPoints * POINT_VALUE;
  const contracts = Math.floor(budget / contractRisk);
  const used = contracts * contractRisk;

  document.querySelector("#riskBudget").textContent = money.format(budget);
  document.querySelector("#contractRisk").textContent = money.format(contractRisk);
  document.querySelector("#contractCount").innerHTML = `${contracts} <small>MES</small>`;
  document.querySelector("#unusedBudget").textContent = money.format(Math.max(0, budget - used));

  const warning = document.querySelector("#riskWarning");
  warning.classList.toggle("hidden", contracts > 0);
  warning.textContent = contracts > 0
    ? ""
    : "Risk budget is below the modeled loss for one MES contract at this stop distance.";
}

document.querySelectorAll(".calculator input").forEach(input => {
  input.addEventListener("input", calculateRisk);
});
calculateRisk();

function exchangeClock() {
  const now = new Date();
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Chicago",
      hour12: false,
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    }).formatToParts(now).filter(part => part.type !== "literal").map(part => [part.type, part.value])
  );
  const hour = Number(parts.hour) % 24;
  const minute = Number(parts.minute);
  const total = hour * 60 + minute;
  let session = "Globex";
  let next = "RTH open · 08:30";

  if (total >= 510 && total < 900) {
    session = "US regular session";
    next = "RTH close · 15:00";
  } else if (total >= 900 && total < 960) {
    session = "Post-close";
    next = "Maintenance · 16:00";
  } else if (total >= 960 && total < 1020) {
    session = "Maintenance";
    next = "Globex reopen · 17:00";
  } else if (total >= 1020) {
    next = "RTH open · 08:30";
  }

  document.querySelector("#exchangeTime").textContent =
    `${parts.weekday} ${parts.hour}:${parts.minute}:${parts.second} CT`;
  document.querySelector("#sessionName").textContent = session;
  document.querySelector("#nextEvent").textContent = next;
}
exchangeClock();
setInterval(exchangeClock, 1000);

const canvas = document.querySelector("#marketChart");
const ctx = canvas.getContext("2d");
const simulationPrices = [
  5618.25, 5619.5, 5618.75, 5620, 5622.25, 5621.5, 5623.75, 5624.25,
  5622.75, 5621.25, 5620.75, 5622.5, 5624, 5623.25, 5625.5, 5624.75,
  5626.25, 5625.75, 5627, 5625
];
let prices = [...simulationPrices];
let vwap = 5621.75;
let rangeHigh = 5627.25;
let rangeLow = 5618.75;

function drawChart() {
  const rect = canvas.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.round(rect.width * ratio);
  canvas.height = Math.round(rect.height * ratio);
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  const w = rect.width;
  const h = rect.height;
  const pad = { left: 10, right: 52, top: 14, bottom: 25 };
  const min = Math.min(...prices, rangeLow) - 1.5;
  const max = Math.max(...prices, rangeHigh) + 1.5;
  const x = i => pad.left + (i / (prices.length - 1)) * (w - pad.left - pad.right);
  const y = value => pad.top + (max - value) / (max - min) * (h - pad.top - pad.bottom);

  ctx.clearRect(0, 0, w, h);
  ctx.strokeStyle = "rgba(148,152,145,.14)";
  ctx.lineWidth = 1;
  ctx.font = "10px ui-monospace, monospace";
  ctx.fillStyle = "#777c76";
  for (let i = 0; i < 5; i++) {
    const value = min + (max - min) * i / 4;
    const py = y(value);
    ctx.beginPath();
    ctx.moveTo(pad.left, py);
    ctx.lineTo(w - pad.right, py);
    ctx.stroke();
    ctx.fillText(value.toFixed(2), w - pad.right + 8, py + 3);
  }

  ctx.fillStyle = "rgba(242,186,97,.06)";
  ctx.fillRect(pad.left, y(rangeHigh), w - pad.left - pad.right, y(rangeLow) - y(rangeHigh));
  ctx.setLineDash([5, 5]);
  ctx.strokeStyle = "rgba(242,186,97,.38)";
  [rangeHigh, rangeLow].forEach(level => {
    ctx.beginPath(); ctx.moveTo(pad.left, y(level)); ctx.lineTo(w - pad.right, y(level)); ctx.stroke();
  });

  ctx.strokeStyle = "#70d5cc";
  ctx.lineWidth = 1.25;
  ctx.beginPath(); ctx.moveTo(pad.left, y(vwap)); ctx.lineTo(w - pad.right, y(vwap)); ctx.stroke();
  ctx.setLineDash([]);

  const gradient = ctx.createLinearGradient(0, pad.top, 0, h - pad.bottom);
  gradient.addColorStop(0, "rgba(199,243,107,.25)");
  gradient.addColorStop(1, "rgba(199,243,107,0)");
  ctx.beginPath();
  prices.forEach((price, i) => i ? ctx.lineTo(x(i), y(price)) : ctx.moveTo(x(i), y(price)));
  ctx.lineTo(x(prices.length - 1), h - pad.bottom);
  ctx.lineTo(x(0), h - pad.bottom);
  ctx.closePath();
  ctx.fillStyle = gradient;
  ctx.fill();

  ctx.beginPath();
  prices.forEach((price, i) => i ? ctx.lineTo(x(i), y(price)) : ctx.moveTo(x(i), y(price)));
  ctx.strokeStyle = "#c7f36b";
  ctx.lineWidth = 2;
  ctx.stroke();

  const lastX = x(prices.length - 1);
  const lastY = y(prices.at(-1));
  ctx.beginPath(); ctx.arc(lastX, lastY, 4, 0, Math.PI * 2);
  ctx.fillStyle = "#c7f36b"; ctx.fill();
}

drawChart();
window.addEventListener("resize", drawChart);

function parseCsvLine(line) {
  const values = [];
  let value = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (quoted && line[i + 1] === '"') {
        value += '"';
        i++;
      } else {
        quoted = !quoted;
      }
    } else if (char === "," && !quoted) {
      values.push(value.trim());
      value = "";
    } else {
      value += char;
    }
  }
  values.push(value.trim());
  return values;
}

function median(values) {
  if (!values.length) return 0;
  const ordered = [...values].sort((a, b) => a - b);
  const middle = Math.floor(ordered.length / 2);
  return ordered.length % 2
    ? ordered[middle]
    : (ordered[middle - 1] + ordered[middle]) / 2;
}

function tickAligned(value) {
  return Math.abs(value / TICK_SIZE - Math.round(value / TICK_SIZE)) < 1e-7;
}

function parseCandleCsv(text) {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter(line => line.trim());
  if (lines.length < 2) throw new Error("The CSV has a header but no candle rows.");

  const headers = parseCsvLine(lines[0]).map(header => header.toLowerCase().replace(/\s+/g, ""));
  const required = ["timestamp", "open", "high", "low", "close", "volume"];
  const missing = required.filter(name => !headers.includes(name));
  if (missing.length) throw new Error(`Missing required column${missing.length > 1 ? "s" : ""}: ${missing.join(", ")}.`);

  const index = Object.fromEntries(required.map(name => [name, headers.indexOf(name)]));
  const candles = [];
  let rejected = 0;
  let tickErrors = 0;

  for (const line of lines.slice(1)) {
    const cells = parseCsvLine(line);
    const timestampText = cells[index.timestamp] || "";
    const explicitZone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(timestampText);
    const timestamp = Date.parse(timestampText);
    const candle = {
      timestamp,
      open: Number(cells[index.open]),
      high: Number(cells[index.high]),
      low: Number(cells[index.low]),
      close: Number(cells[index.close]),
      volume: Number(cells[index.volume])
    };
    const pricesInBar = [candle.open, candle.high, candle.low, candle.close];
    const structurallyValid = explicitZone &&
      Number.isFinite(timestamp) &&
      pricesInBar.every(Number.isFinite) &&
      Number.isFinite(candle.volume) &&
      candle.volume >= 0 &&
      candle.high >= Math.max(candle.open, candle.close, candle.low) &&
      candle.low <= Math.min(candle.open, candle.close, candle.high);
    if (!structurallyValid) {
      rejected++;
      continue;
    }
    if (!pricesInBar.every(tickAligned)) tickErrors++;
    candles.push(candle);
  }

  candles.sort((a, b) => a.timestamp - b.timestamp);
  const unique = [];
  let duplicates = 0;
  for (const candle of candles) {
    if (unique.length && candle.timestamp === unique.at(-1).timestamp) {
      duplicates++;
    } else {
      unique.push(candle);
    }
  }
  if (unique.length < 2) throw new Error("At least two valid, uniquely timestamped candles are required.");

  const intervals = unique.slice(1).map((candle, i) => candle.timestamp - unique[i].timestamp);
  const interval = median(intervals);
  const gaps = interval > 0 ? intervals.filter(value => value > interval * 1.5).length : 0;
  return { candles: unique, rejected, duplicates, tickErrors, gaps, interval };
}

function intervalLabel(milliseconds) {
  const minutes = milliseconds / 60000;
  if (minutes < 60) return `${Number(minutes.toFixed(2))}m`;
  return `${Number((minutes / 60).toFixed(2))}h`;
}

function renderImportedData(result, fileName) {
  const candles = result.candles;
  prices = candles.slice(-200).map(candle => candle.close);
  const volumeTotal = candles.reduce((sum, candle) => sum + candle.volume, 0);
  vwap = volumeTotal > 0
    ? candles.reduce((sum, candle) => sum + ((candle.high + candle.low + candle.close) / 3) * candle.volume, 0) / volumeTotal
    : candles.reduce((sum, candle) => sum + candle.close, 0) / candles.length;

  const openingCutoff = candles[0].timestamp + 30 * 60000;
  const openingCandles = candles.filter(candle => candle.timestamp < openingCutoff);
  rangeHigh = Math.max(...openingCandles.map(candle => candle.high));
  rangeLow = Math.min(...openingCandles.map(candle => candle.low));
  const last = candles.at(-1).close;
  const first = candles[0].open;
  const change = last - first;
  const changePercent = first ? change / first * 100 : 0;

  document.querySelector("#lastPrice").textContent = last.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  document.querySelector("#priceChange").textContent = `${change >= 0 ? "+" : ""}${change.toFixed(2)} · ${change >= 0 ? "+" : ""}${changePercent.toFixed(2)}%`;
  document.querySelector("#priceChange").style.color = change >= 0 ? "var(--lime)" : "var(--red)";
  document.querySelector("#vwap").textContent = vwap.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  document.querySelector("#openingRange").textContent = `${(rangeHigh - rangeLow).toFixed(2)} pts`;
  document.querySelector("#vwapLocation").textContent = `${last >= vwap ? "Above" : "Below"} · ${Math.abs(last - vwap).toFixed(2)} pts`;
  document.querySelector("#orPosition").textContent = last > rangeHigh ? "Above range" : last < rangeLow ? "Below range" : "Inside range";
  document.querySelector("#validRows").textContent = candles.length.toLocaleString();
  document.querySelector("#rejectedRows").textContent = result.rejected.toLocaleString();
  document.querySelector("#duplicateRows").textContent = result.duplicates.toLocaleString();
  document.querySelector("#gapCount").textContent = result.gaps.toLocaleString();
  document.querySelector("#tickErrors").textContent = result.tickErrors.toLocaleString();
  document.querySelector("#barInterval").textContent = intervalLabel(result.interval);
  document.querySelector("#qualityStatus").textContent = result.rejected || result.duplicates || result.gaps || result.tickErrors ? "REVIEW" : "PASSED";
  document.querySelector("#qualityStatus").className = `tag ${result.rejected || result.duplicates || result.gaps || result.tickErrors ? "paper" : "safe"}`;
  document.querySelector("#importMessage").className = "import-message success";
  document.querySelector("#importMessage").textContent = `${fileName}: ${candles.length.toLocaleString()} candles loaded locally. No data was uploaded.`;
  document.querySelector("#dataMode").textContent = "LOCAL CSV";
  drawChart();
}

function resetSimulation() {
  prices = [...simulationPrices];
  vwap = 5621.75;
  rangeHigh = 5627.25;
  rangeLow = 5618.75;
  document.querySelector("#lastPrice").textContent = "5,625.00";
  document.querySelector("#priceChange").textContent = "+3.25 · +0.06%";
  document.querySelector("#priceChange").style.color = "";
  document.querySelector("#vwap").textContent = "5,621.75";
  document.querySelector("#openingRange").textContent = "8.50 pts";
  document.querySelector("#vwapLocation").textContent = "Above · 3.25 pts";
  document.querySelector("#orPosition").textContent = "Inside range";
  document.querySelector("#validRows").textContent = simulationPrices.length;
  ["#rejectedRows", "#duplicateRows", "#gapCount", "#tickErrors"].forEach(selector => {
    document.querySelector(selector).textContent = "0";
  });
  document.querySelector("#barInterval").textContent = "SIM";
  document.querySelector("#qualityStatus").textContent = "SIMULATION";
  document.querySelector("#qualityStatus").className = "tag neutral";
  document.querySelector("#importMessage").className = "import-message";
  document.querySelector("#importMessage").textContent = "Illustrative data is active. Importing a file never uploads it or sends it anywhere.";
  document.querySelector("#dataMode").textContent = "SIMULATED";
  document.querySelector("#csvInput").value = "";
  drawChart();
}

document.querySelector("#csvInput").addEventListener("change", async event => {
  const file = event.target.files[0];
  if (!file) return;
  try {
    const result = parseCandleCsv(await file.text());
    renderImportedData(result, file.name);
  } catch (error) {
    document.querySelector("#importMessage").className = "import-message error";
    document.querySelector("#importMessage").textContent = `Import rejected: ${error.message}`;
    document.querySelector("#qualityStatus").textContent = "REJECTED";
    document.querySelector("#qualityStatus").className = "tag blocked";
  }
});

document.querySelector("#resetData").addEventListener("click", resetSimulation);
