"""
ExnessGoldGuard Signal History Processor
Reads activity-xauusd.csv and produces signals-history.json
Run standalone or import build_history() from other scripts.
"""

import csv
import json
import re
from datetime import datetime, timezone
from pathlib import Path

RUNTIME = Path(__file__).parent.parent / "runtime"
CSV_PATH = RUNTIME / "activity-xauusd.csv"
OUT_PATH = RUNTIME / "signals-history.json"
MAX_CSV_BYTES = 25_000_000
MAX_ROWS = 250_000


def parse_shadow_entry(msg: str) -> dict:
    """Parse: 'XAUUSDm virtual BUY 0.02 lots | entry 4120.000 | SL 4107.600 | TP 4144.800 | risk 24.80'"""
    m = re.search(
        r"virtual (?P<side>BUY|SELL) (?P<vol>[\d.]+) lots \| entry (?P<entry>[\d.]+) "
        r"\| SL (?P<sl>[\d.]+) \| TP (?P<tp>[\d.]+) \| risk (?P<risk>[\d.]+)", msg)
    if not m:
        return {}
    return {k: float(v) if k != "side" else v for k, v in m.groupdict().items()}


def parse_shadow_exit(msg: str) -> dict:
    """Parse: 'XAUUSDm virtual TARGET | 2.00R | P/L 49.60 | MFE 2.10R | MAE -0.30R'"""
    m = re.search(
        r"virtual (?P<outcome>TARGET|STOP) \| (?P<result_r>[+-]?[\d.]+)R "
        r"\| P/L (?P<pl>[+-]?[\d.]+) \| MFE (?P<mfe>[+-]?[\d.]+)R \| MAE (?P<mae>[+-]?[\d.]+)R", msg)
    if not m:
        return {}
    d = m.groupdict()
    return {k: float(v) if k != "outcome" else v for k, v in d.items()}


def parse_alert(msg: str) -> dict:
    """Parse ALERT_WATCH and ALERT_TRADE messages for check scores."""
    m = re.search(r"(\d+)/(\d+) checks", msg)
    if m:
        return {"checks": int(m.group(1)), "total": int(m.group(2))}
    return {}


def build_history() -> dict:
    if not CSV_PATH.exists():
        return {"generated": datetime.now(timezone.utc).isoformat(), "signals": [], "summary": {}}
    if not CSV_PATH.is_file() or CSV_PATH.stat().st_size > MAX_CSV_BYTES:
        raise ValueError("Activity journal is missing or exceeds the size limit")

    signals = []
    pending = None   # open shadow trade waiting for exit
    alert_log = []   # track ALERT_WATCH / ALERT_TRADE events

    with open(CSV_PATH, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f, delimiter=";")
        for row_number, row in enumerate(reader, start=1):
            if row_number > MAX_ROWS:
                raise ValueError("Activity journal exceeds the row limit")
            event = row.get("event", "")
            msg = row.get("message", "")[:2000]
            try:
                ts = int(row.get("time_unix", 0))
                buy_checks = int(row.get("buy_checks", 0))
                sell_checks = int(row.get("sell_checks", 0))
            except (TypeError, ValueError):
                continue
            time_str = row.get("time_server", "")[:40]
            symbol = row.get("symbol", "")[:32]

            if event == "SHADOW_ENTRY":
                info = parse_shadow_entry(msg)
                if info:
                    pending = {
                        "id": len(signals) + 1,
                        "open_time": ts,
                        "open_time_str": time_str,
                        "symbol": symbol,
                        "side": info.get("side", ""),
                        "entry": info.get("entry", 0),
                        "sl": info.get("sl", 0),
                        "tp": info.get("tp", 0),
                        "risk_cash": info.get("risk", 0),
                        "volume": info.get("vol", 0),
                        "buy_checks_at_open": buy_checks,
                        "sell_checks_at_open": sell_checks,
                        "status": "OPEN",
                        "outcome": None,
                        "close_time": None,
                        "close_time_str": None,
                        "result_r": None,
                        "pl": None,
                        "mfe_r": None,
                        "mae_r": None,
                        "duration_hours": None,
                    }

            elif event == "SHADOW_EXIT" and pending is not None:
                info = parse_shadow_exit(msg)
                if info:
                    pending["status"] = "CLOSED"
                    pending["outcome"] = info.get("outcome", "")
                    pending["close_time"] = ts
                    pending["close_time_str"] = time_str
                    pending["result_r"] = info.get("result_r", 0)
                    pending["pl"] = info.get("pl", 0)
                    pending["mfe_r"] = info.get("mfe", 0)
                    pending["mae_r"] = info.get("mae", 0)
                    if pending["open_time"]:
                        pending["duration_hours"] = round(
                            (ts - pending["open_time"]) / 3600, 2)
                    signals.append(pending)
                    pending = None

            elif event in ("ALERT_WATCH", "ALERT_TRADE"):
                alert_log.append({
                    "time": ts,
                    "time_str": time_str,
                    "event": event,
                    "side": "BUY" if buy_checks > sell_checks else "SELL",
                    "buy_checks": buy_checks,
                    "sell_checks": sell_checks,
                    "message": msg,
                })

    # If a trade is still open, include it
    if pending:
        signals.append(pending)

    # Build summary
    closed = [s for s in signals if s["status"] == "CLOSED"]
    wins = [s for s in closed if s["outcome"] == "TARGET"]
    losses = [s for s in closed if s["outcome"] == "STOP"]
    win_rate = round(len(wins) / len(closed) * 100, 2) if closed else 0
    gross_win_r = sum(s["result_r"] for s in wins)
    gross_loss_r = sum(abs(s["result_r"]) for s in losses)
    profit_factor = round(gross_win_r / gross_loss_r, 3) if gross_loss_r > 0 else 0
    net_r = sum(s["result_r"] for s in closed if s["result_r"] is not None)

    # Consecutive losses
    max_consec_loss = consec = 0
    for s in closed:
        if s["outcome"] == "STOP":
            consec += 1
            max_consec_loss = max(max_consec_loss, consec)
        else:
            consec = 0

    # Max drawdown in R
    peak = equity = 0.0
    max_dd_r = 0.0
    for s in closed:
        equity += s["result_r"] or 0
        if equity > peak:
            peak = equity
        dd = peak - equity
        if dd > max_dd_r:
            max_dd_r = dd

    summary = {
        "total_signals": len(signals),
        "closed": len(closed),
        "open": len([s for s in signals if s["status"] == "OPEN"]),
        "wins": len(wins),
        "losses": len(losses),
        "win_rate_pct": win_rate,
        "profit_factor": profit_factor,
        "net_r": round(net_r, 3),
        "max_consec_losses": max_consec_loss,
        "max_drawdown_r": round(max_dd_r, 3),
        "total_alerts": len(alert_log),
        "validation": {
            "win_rate_ok": win_rate >= 55,
            "profit_factor_ok": profit_factor >= 1.8,
            "consec_losses_ok": max_consec_loss <= 4,
            "min_trades_reached": len(closed) >= 50,
        }
    }

    result = {
        "generated": datetime.now(timezone.utc).isoformat(),
        "signals": list(reversed(signals)),   # newest first
        "alerts": list(reversed(alert_log[-50:])),   # last 50 alerts
        "summary": summary,
    }
    return result


if __name__ == "__main__":
    history = build_history()
    OUT_PATH.write_text(json.dumps(history, indent=2), encoding="utf-8")
    s = history["summary"]
    print(f"Signal History built -> {OUT_PATH}")
    print(f"  Signals : {s['total_signals']} total | {s['closed']} closed | {s['open']} open")
    print(f"  Win rate: {s['win_rate_pct']}% | PF: {s['profit_factor']} | Net R: {s['net_r']}")
    print(f"  Max consec losses: {s['max_consec_losses']} | Max DD: {s['max_drawdown_r']}R")
    print(f"  Validation gates: {s['validation']}")
