from datetime import date, datetime, timezone

from stockforge_ml.market_evidence import (
    evaluate_earnings_calendar,
    evaluate_news,
    trading_days_after,
)


def test_earnings_inside_two_trading_days_blocks_gate():
    result = evaluate_earnings_calendar(
        "AAA",
        [{"symbol": "AAA", "reportDate": "2026-07-07"}],
        date(2026, 7, 4),
    )
    assert result["withinTwoTradingDays"]
    assert not result["passed"]


def test_relevant_negative_news_blocks_gate():
    payload = {
        "feed": [
            {
                "title": "Company withdraws guidance",
                "summary": "Management cited unexpected conditions.",
                "url": "https://example.test/article",
                "source": "Test Wire",
                "time_published": "20260705T120000",
                "ticker_sentiment": [
                    {
                        "ticker": "AAA",
                        "relevance_score": "0.9",
                        "ticker_sentiment_score": "-0.5",
                    }
                ],
            }
        ]
    }
    result = evaluate_news(
        "AAA", payload, datetime(2026, 7, 4, 20, tzinfo=timezone.utc)
    )
    assert result["available"]
    assert result["adverseCount"] == 1
    assert not result["passed"]


def test_unavailable_news_fails_closed():
    result = evaluate_news(
        "AAA",
        {"Note": "rate limit"},
        datetime(2026, 7, 4, tzinfo=timezone.utc),
    )
    assert not result["available"]
    assert not result["passed"]


def test_two_trading_day_window_skips_observed_independence_day():
    assert trading_days_after(date(2026, 7, 2), 2) == date(2026, 7, 7)
