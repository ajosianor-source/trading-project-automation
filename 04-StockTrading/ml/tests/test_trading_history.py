import pytest

from stockforge_ml.trading_history import build_trade_history, merge_executions


def execution(exec_id, time, side, shares, price, commission=0, symbol="AAPL"):
    return {
        "executionId": exec_id,
        "time": time,
        "side": side,
        "shares": shares,
        "price": price,
        "commission": commission,
        "symbol": symbol,
    }


def test_fifo_round_trip_includes_commissions():
    history = build_trade_history(
        [
            execution("B1", "20260701 10:00:00", "BOT", 10, 100, 1),
            execution("S1", "20260702 10:00:00", "SLD", 10, 110, 1),
        ]
    )
    trade = history["closedTrades"][0]
    assert trade["grossPnl"] == 100
    assert trade["realizedPnl"] == 98
    assert trade["returnPercent"] == pytest.approx(9.8)
    assert history["statistics"]["winRatePercent"] == 100
    assert history["statistics"]["realizedPnl"] == 98
    assert history["openPositions"] == []


def test_partial_exit_leaves_open_position_and_matches_fifo():
    history = build_trade_history(
        [
            execution("B1", "20260701 10:00:00", "BUY", 10, 100),
            execution("S1", "20260702 10:00:00", "SELL", 4, 95),
        ]
    )
    assert history["statistics"]["closedTradeCount"] == 1
    assert history["statistics"]["realizedPnl"] == -20
    assert history["openPositions"][0]["quantity"] == 6
    assert history["openPositions"][0]["averageEntryPrice"] == 100


def test_execution_merge_deduplicates_stable_ibkr_id():
    original = execution("B1", "20260701 10:00:00", "BOT", 10, 100)
    updated = {**original, "commission": 1.25}
    merged = merge_executions([original], [updated])
    assert len(merged) == 1
    assert merged[0]["commission"] == 1.25
