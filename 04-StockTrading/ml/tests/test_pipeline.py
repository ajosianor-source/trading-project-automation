from datetime import datetime, timezone

import numpy as np
import pandas as pd

from stockforge_ml.broker import build_paper_intent
from stockforge_ml.contracts import DecisionStatus, ModelDecision
from stockforge_ml.features import FEATURE_COLUMNS, engineer_features
from stockforge_ml.risk import PortfolioRiskEngine, RiskLimits, historical_cvar


def synthetic_bars(symbols=("SPY", "AAA", "BBB"), periods=320):
    random = np.random.default_rng(20260703)
    timestamps = pd.bdate_range(end=pd.Timestamp.now(tz="UTC"), periods=periods)
    rows = []
    for offset, symbol in enumerate(symbols):
        returns = random.normal(0.0003 + offset * 0.0001, 0.012, periods)
        close = (100 + offset * 20) * np.exp(np.cumsum(returns))
        for index, timestamp in enumerate(timestamps):
            spread = close[index] * 0.01
            rows.append(
                {
                    "timestamp": timestamp,
                    "symbol": symbol,
                    "open": close[index] * 0.998,
                    "high": close[index] + spread,
                    "low": close[index] - spread,
                    "close": close[index],
                    "volume": 2_000_000 + int(random.integers(0, 1_000_000)),
                }
            )
    return pd.DataFrame(rows)


def approved_decision():
    return ModelDecision(
        symbol="AAA",
        timestamp=datetime.now(timezone.utc),
        status=DecisionStatus.APPROVED,
        side=1,
        alpha_probability=0.63,
        meta_probability=0.72,
        expected_return=0.01,
        score=70,
        reasons=("test",),
    )


def test_features_are_complete_after_warmup():
    features = engineer_features(synthetic_bars())
    complete = features.dropna(subset=FEATURE_COLUMNS)
    assert len(complete) > 300
    assert np.isfinite(complete[FEATURE_COLUMNS].to_numpy()).all()


def test_risk_engine_caps_position_and_blocks_duplicate():
    engine = PortfolioRiskEngine(RiskLimits(account_equity=10_000))
    plan = engine.size(approved_decision(), price=100, atr=2)
    assert plan.approved
    assert plan.notional <= 1_000
    intent = build_paper_intent(plan, 100.5, "test-001", set())
    assert intent.side == "buy"

    try:
        build_paper_intent(plan, 100.5, "test-002", {"AAA"})
    except ValueError as error:
        assert "already has an open position" in str(error)
    else:
        raise AssertionError("Duplicate-position gate did not fire.")


def test_historical_cvar_is_positive_for_loss_tail():
    returns = np.linspace(-0.05, 0.04, 100)
    assert historical_cvar(returns) > 0.04
