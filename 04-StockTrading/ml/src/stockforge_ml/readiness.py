from __future__ import annotations

from typing import Any


def build_trade_readiness(
    *,
    eligible: bool,
    market_regime: str,
    score: float,
    fundamental_score: float | None,
    risk_quality_score: float,
    data_fresh: bool,
    completed_daily_bar: bool,
    earnings_evidence: dict[str, Any] | None = None,
    news_evidence: dict[str, Any] | None = None,
) -> dict[str, Any]:
    earnings_evidence = earnings_evidence or {}
    news_evidence = news_evidence or {}
    automatic_checks = [
        {
            "id": "eligible",
            "label": "Basic market-data screening passed",
            "passed": bool(eligible),
        },
        {
            "id": "risk_on",
            "label": "Market regime is RISK-ON",
            "passed": bool(market_regime.lower() == "risk-on"),
        },
        {
            "id": "score_75",
            "label": "Composite score is at least 75",
            "passed": bool(score >= 75),
        },
        {
            "id": "fundamentals",
            "label": "Point-in-time fundamental score is available",
            "passed": bool(fundamental_score is not None),
        },
        {
            "id": "risk_quality",
            "label": "Risk-quality score is at least 60",
            "passed": bool(risk_quality_score >= 60),
        },
        {
            "id": "fresh_data",
            "label": "Market data passes the freshness limit",
            "passed": bool(data_fresh),
        },
        {
            "id": "completed_bar",
            "label": "Signal uses a completed US daily session",
            "passed": bool(completed_daily_bar),
        },
        {
            "id": "earnings_clear",
            "label": "No earnings announcement within two trading days",
            "passed": bool(
                earnings_evidence.get("available")
                and earnings_evidence.get("passed")
            ),
            "detail": (
                f"Next scheduled date: {earnings_evidence.get('nextEarningsDate') or 'none in provider horizon'}"
                if earnings_evidence.get("available")
                else earnings_evidence.get("reason", "Earnings evidence unavailable")
            ),
        },
        {
            "id": "news_clear",
            "label": "No serious adverse post-session news was flagged",
            "passed": bool(
                news_evidence.get("available") and news_evidence.get("passed")
            ),
            "detail": (
                f"{news_evidence.get('articleCount', 0)} relevant article(s); "
                f"{news_evidence.get('adverseCount', 0)} adverse flag(s)"
                if news_evidence.get("available")
                else news_evidence.get("reason", "News evidence unavailable")
            ),
        },
    ]
    automatic_passed = all(check["passed"] for check in automatic_checks)
    return {
        "automaticPassed": automatic_passed,
        "automaticChecks": automatic_checks,
        "manualChecks": [],
        "paperTradeReady": automatic_passed,
        "meaning": (
            "All automated paper-trade evidence checks passed."
            if automatic_passed
            else "One or more automated paper-trade checks failed or lacked evidence."
        ),
    }
