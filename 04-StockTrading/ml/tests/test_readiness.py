from stockforge_ml.readiness import build_trade_readiness


def readiness(**overrides):
    values = {
        "eligible": True,
        "market_regime": "risk-on",
        "score": 80,
        "fundamental_score": 70,
        "risk_quality_score": 65,
        "data_fresh": True,
        "completed_daily_bar": True,
        "earnings_evidence": {"available": True, "passed": True},
        "news_evidence": {"available": True, "passed": True},
    }
    values.update(overrides)
    return build_trade_readiness(**values)


def test_all_automatic_trade_readiness_checks_can_pass():
    result = readiness()
    assert result["automaticPassed"]
    assert result["paperTradeReady"]
    assert len(result["manualChecks"]) == 0


def test_missing_fundamentals_and_weak_risk_block_readiness():
    result = readiness(fundamental_score=None, risk_quality_score=59.9)
    assert not result["automaticPassed"]
    failed = {
        check["id"]
        for check in result["automaticChecks"]
        if not check["passed"]
    }
    assert failed == {"fundamentals", "risk_quality"}


def test_missing_or_adverse_external_evidence_fails_closed():
    result = readiness(
        earnings_evidence={"available": False, "passed": False},
        news_evidence={"available": True, "passed": False, "adverseCount": 1},
    )
    assert not result["paperTradeReady"]
    failed = {
        check["id"]
        for check in result["automaticChecks"]
        if not check["passed"]
    }
    assert failed == {"earnings_clear", "news_clear"}
