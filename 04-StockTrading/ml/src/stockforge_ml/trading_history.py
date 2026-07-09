from __future__ import annotations

from collections import defaultdict, deque
from datetime import datetime, timezone
from typing import Any


def _side(value: str) -> str:
    normalized = value.strip().upper()
    if normalized in {"BOT", "BUY"}:
        return "BUY"
    if normalized in {"SLD", "SELL"}:
        return "SELL"
    return normalized


def merge_executions(
    existing: list[dict[str, Any]], fresh: list[dict[str, Any]]
) -> list[dict[str, Any]]:
    """Merge execution snapshots by IBKR's stable execution ID."""
    merged = {
        item["executionId"]: item
        for item in [*existing, *fresh]
        if item.get("executionId")
    }
    return sorted(
        merged.values(),
        key=lambda item: (item.get("time", ""), item["executionId"]),
    )


def build_trade_history(executions: list[dict[str, Any]]) -> dict[str, Any]:
    """Match long stock executions FIFO and calculate realized paper P/L."""
    lots: dict[str, deque[dict[str, Any]]] = defaultdict(deque)
    closed: list[dict[str, Any]] = []
    unmatched_sells: list[dict[str, Any]] = []
    ordered = sorted(
        executions,
        key=lambda item: (item.get("time", ""), item.get("executionId", "")),
    )

    for execution in ordered:
        symbol = str(execution.get("symbol", "")).upper()
        quantity = float(execution.get("shares", 0))
        price = float(execution.get("price", 0))
        commission = float(execution.get("commission") or 0)
        if not symbol or quantity <= 0 or price <= 0:
            continue
        commission_per_share = commission / quantity
        side = _side(str(execution.get("side", "")))
        if side == "BUY":
            lots[symbol].append(
                {
                    "quantity": quantity,
                    "price": price,
                    "time": execution.get("time"),
                    "executionId": execution.get("executionId"),
                    "commissionPerShare": commission_per_share,
                }
            )
            continue
        if side != "SELL":
            continue

        remaining = quantity
        while remaining > 1e-9 and lots[symbol]:
            lot = lots[symbol][0]
            matched = min(remaining, lot["quantity"])
            fees = matched * (
                lot["commissionPerShare"] + commission_per_share
            )
            gross = (price - lot["price"]) * matched
            pnl = gross - fees
            closed.append(
                {
                    "symbol": symbol,
                    "entryTime": lot["time"],
                    "exitTime": execution.get("time"),
                    "quantity": round(matched, 8),
                    "entryPrice": round(lot["price"], 6),
                    "exitPrice": round(price, 6),
                    "grossPnl": round(gross, 2),
                    "commission": round(fees, 2),
                    "realizedPnl": round(pnl, 2),
                    "returnPercent": round(
                        (pnl / (lot["price"] * matched)) * 100, 2
                    ),
                    "entryExecutionId": lot["executionId"],
                    "exitExecutionId": execution.get("executionId"),
                }
            )
            lot["quantity"] -= matched
            remaining -= matched
            if lot["quantity"] <= 1e-9:
                lots[symbol].popleft()
        if remaining > 1e-9:
            unmatched_sells.append(
                {
                    "symbol": symbol,
                    "time": execution.get("time"),
                    "quantity": round(remaining, 8),
                    "executionId": execution.get("executionId"),
                    "reason": "No matching long buy execution in local journal",
                }
            )

    open_positions = []
    for symbol, symbol_lots in sorted(lots.items()):
        quantity = sum(lot["quantity"] for lot in symbol_lots)
        if quantity <= 1e-9:
            continue
        cost = sum(lot["quantity"] * lot["price"] for lot in symbol_lots)
        open_positions.append(
            {
                "symbol": symbol,
                "quantity": round(quantity, 8),
                "averageEntryPrice": round(cost / quantity, 6),
                "costBasis": round(cost, 2),
            }
        )

    pnl_values = [trade["realizedPnl"] for trade in closed]
    wins = [value for value in pnl_values if value > 0]
    losses = [value for value in pnl_values if value < 0]
    gross_profit = sum(wins)
    gross_loss = abs(sum(losses))
    statistics = {
        "executionCount": len(ordered),
        "closedTradeCount": len(closed),
        "winningTrades": len(wins),
        "losingTrades": len(losses),
        "winRatePercent": round(len(wins) / len(closed) * 100, 1)
        if closed
        else None,
        "realizedPnl": round(sum(pnl_values), 2),
        "averageTradePnl": round(sum(pnl_values) / len(closed), 2)
        if closed
        else None,
        "profitFactor": round(gross_profit / gross_loss, 2)
        if gross_loss
        else None,
    }
    return {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "source": "IBKR paper executions (local append-only journal)",
        "statistics": statistics,
        "closedTrades": sorted(
            closed, key=lambda item: item.get("exitTime", ""), reverse=True
        ),
        "openPositions": open_positions,
        "unmatchedSells": unmatched_sells,
    }
