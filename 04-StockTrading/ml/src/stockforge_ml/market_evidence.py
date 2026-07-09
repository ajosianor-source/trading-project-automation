from __future__ import annotations

import csv
import json
import re
import time
from datetime import date, datetime, timedelta, timezone
from io import StringIO
from pathlib import Path
from typing import Any
from urllib.parse import urlencode
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen
from zoneinfo import ZoneInfo


SEVERE_NEWS_PATTERN = re.compile(
    r"\b(bankrupt(?:cy)?|fraud|criminal investigation|accounting irregularit"
    r"(?:y|ies)|data breach|product recall|guidance (?:cut|withdrawn)|"
    r"dividend (?:cut|suspended)|default|insolvenc(?:y|ies))\b",
    re.IGNORECASE,
)


def _observed_fixed(year: int, month: int, day: int) -> date:
    holiday = date(year, month, day)
    if holiday.weekday() == 5:
        return holiday - timedelta(days=1)
    if holiday.weekday() == 6:
        return holiday + timedelta(days=1)
    return holiday


def _nth_weekday(year: int, month: int, weekday: int, occurrence: int) -> date:
    first = date(year, month, 1)
    offset = (weekday - first.weekday()) % 7
    return first + timedelta(days=offset + (occurrence - 1) * 7)


def _last_weekday(year: int, month: int, weekday: int) -> date:
    next_month = date(year + (month == 12), month % 12 + 1, 1)
    current = next_month - timedelta(days=1)
    return current - timedelta(days=(current.weekday() - weekday) % 7)


def _easter_sunday(year: int) -> date:
    a = year % 19
    b, c = divmod(year, 100)
    d, e = divmod(b, 4)
    f = (b + 8) // 25
    g = (b - f + 1) // 3
    h = (19 * a + b - d - g + 15) % 30
    i, k = divmod(c, 4)
    weekday_offset = (32 + 2 * e + 2 * i - h - k) % 7
    m = (a + 11 * h + 22 * weekday_offset) // 451
    month = (h + weekday_offset - 7 * m + 114) // 31
    day = (h + weekday_offset - 7 * m + 114) % 31 + 1
    return date(year, month, day)


def nyse_holidays(year: int) -> set[date]:
    return {
        _observed_fixed(year, 1, 1),
        _observed_fixed(year + 1, 1, 1),
        _nth_weekday(year, 1, 0, 3),
        _nth_weekday(year, 2, 0, 3),
        _easter_sunday(year) - timedelta(days=2),
        _last_weekday(year, 5, 0),
        _observed_fixed(year, 6, 19),
        _observed_fixed(year, 7, 4),
        _nth_weekday(year, 9, 0, 1),
        _nth_weekday(year, 11, 3, 4),
        _observed_fixed(year, 12, 25),
    }


def trading_days_after(start: date, count: int) -> date:
    current = start
    found = 0
    while found < count:
        current += timedelta(days=1)
        if current.weekday() < 5 and current not in nyse_holidays(current.year):
            found += 1
    return current


def evaluate_earnings_calendar(
    symbol: str, rows: list[dict[str, str]], as_of: date
) -> dict[str, Any]:
    dates = []
    for row in rows:
        if row.get("symbol", "").upper() != symbol.upper():
            continue
        try:
            report_date = date.fromisoformat(row["reportDate"])
        except (KeyError, ValueError):
            continue
        if report_date >= as_of:
            dates.append(report_date)
    next_date = min(dates) if dates else None
    window_end = trading_days_after(as_of, 2)
    within_window = bool(next_date and next_date <= window_end)
    return {
        "available": True,
        "passed": not within_window,
        "nextEarningsDate": next_date.isoformat() if next_date else None,
        "windowStart": as_of.isoformat(),
        "windowEnd": window_end.isoformat(),
        "withinTwoTradingDays": within_window,
        "source": "Alpha Vantage EARNINGS_CALENDAR",
    }


def evaluate_news(
    symbol: str, payload: dict[str, Any], time_from: datetime
) -> dict[str, Any]:
    if "feed" not in payload or not isinstance(payload["feed"], list):
        return {
            "available": False,
            "passed": False,
            "reason": payload.get("Information")
            or payload.get("Note")
            or payload.get("Error Message")
            or "News feed was unavailable",
            "source": "Alpha Vantage NEWS_SENTIMENT",
        }
    articles = []
    adverse = []
    for item in payload["feed"]:
        published_raw = str(item.get("time_published", ""))
        try:
            published = datetime.strptime(
                published_raw[:15], "%Y%m%dT%H%M%S"
            ).replace(tzinfo=timezone.utc)
        except ValueError:
            continue
        if published < time_from:
            continue
        ticker_entry = next(
            (
                entry
                for entry in item.get("ticker_sentiment", [])
                if entry.get("ticker", "").upper() == symbol.upper()
            ),
            None,
        )
        if not ticker_entry:
            continue
        relevance = float(ticker_entry.get("relevance_score") or 0)
        sentiment = float(ticker_entry.get("ticker_sentiment_score") or 0)
        text = f"{item.get('title', '')} {item.get('summary', '')}"
        severe_keyword = bool(SEVERE_NEWS_PATTERN.search(text))
        is_adverse = relevance >= 0.30 and (
            sentiment <= -0.35 or severe_keyword
        )
        article = {
            "title": item.get("title", "Untitled article"),
            "url": item.get("url", ""),
            "source": item.get("source", ""),
            "publishedAt": published.isoformat(),
            "relevance": round(relevance, 3),
            "tickerSentiment": round(sentiment, 3),
            "adverse": is_adverse,
        }
        articles.append(article)
        if is_adverse:
            adverse.append(article)
    return {
        "available": True,
        "passed": not adverse,
        "timeFrom": time_from.isoformat(),
        "articleCount": len(articles),
        "adverseCount": len(adverse),
        "averageTickerSentiment": round(
            sum(item["tickerSentiment"] for item in articles) / len(articles),
            3,
        )
        if articles
        else 0.0,
        "headlines": articles[:10],
        "source": "Alpha Vantage NEWS_SENTIMENT",
        "method": (
            "Relevant ticker sentiment <= -0.35 or severe-risk phrase; "
            "absence of a flag is not proof that no adverse event exists."
        ),
    }


class AlphaVantageEvidenceClient:
    def __init__(
        self,
        api_key: str,
        cache_dir: Path,
        minimum_interval: float = 12.1,
    ) -> None:
        if not api_key.strip():
            raise ValueError("ALPHAVANTAGE_API_KEY is required.")
        self.api_key = api_key.strip()
        self.cache_dir = Path(cache_dir)
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        self.minimum_interval = minimum_interval
        self._last_request = 0.0

    def _get_text(
        self, parameters: dict[str, str], cache_name: str, cache_hours: float
    ) -> str:
        path = self.cache_dir / cache_name
        if path.exists():
            age = (time.time() - path.stat().st_mtime) / 3600
            if age <= cache_hours:
                return path.read_text(encoding="utf-8-sig")
        delay = self.minimum_interval - (time.monotonic() - self._last_request)
        if delay > 0:
            time.sleep(delay)
        query = urlencode({**parameters, "apikey": self.api_key})
        request = Request(
            f"https://www.alphavantage.co/query?{query}",
            headers={"User-Agent": "StockForge/0.1"},
        )
        try:
            with urlopen(request, timeout=30) as response:
                text = response.read().decode("utf-8-sig")
        except (HTTPError, URLError) as exc:
            raise RuntimeError(
                f"Alpha Vantage request failed: {exc}"
            ) from exc
        finally:
            self._last_request = time.monotonic()
        path.write_text(text, encoding="utf-8")
        return text

    def earnings_calendar(self) -> list[dict[str, str]]:
        text = self._get_text(
            {"function": "EARNINGS_CALENDAR", "horizon": "3month"},
            "earnings-calendar-3month.csv",
            12,
        )
        rows = list(csv.DictReader(StringIO(text)))
        if not rows or "symbol" not in rows[0] or "reportDate" not in rows[0]:
            raise RuntimeError(
                "Alpha Vantage earnings calendar was unavailable or rate-limited."
            )
        return rows

    def news(self, symbol: str, time_from: datetime) -> dict[str, Any]:
        eastern = time_from.astimezone(ZoneInfo("America/New_York"))
        text = self._get_text(
            {
                "function": "NEWS_SENTIMENT",
                "tickers": symbol.upper(),
                "time_from": eastern.strftime("%Y%m%dT%H%M"),
                "sort": "LATEST",
                "limit": "200",
            },
            f"news-{symbol.upper()}.json",
            1,
        )
        return json.loads(text)
