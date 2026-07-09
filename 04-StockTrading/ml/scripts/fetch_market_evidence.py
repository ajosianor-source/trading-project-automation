from __future__ import annotations

import argparse
import json
import os
from datetime import datetime, time, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

from stockforge_ml.market_evidence import (
    AlphaVantageEvidenceClient,
    evaluate_earnings_calendar,
    evaluate_news,
)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Fetch fail-closed earnings and post-session news evidence."
    )
    parser.add_argument("--scan", type=Path, default=Path("../data/latest-scan.json"))
    parser.add_argument("--output", type=Path, default=Path("data/market-evidence.json"))
    parser.add_argument("--cache-dir", type=Path, default=Path("data/alpha-evidence-cache"))
    parser.add_argument("--max-news-symbols", type=int, default=10)
    args = parser.parse_args()

    scan = json.loads(args.scan.read_text(encoding="utf-8-sig"))
    api_key = os.environ.get("ALPHAVANTAGE_API_KEY", "")
    client = AlphaVantageEvidenceClient(api_key, args.cache_dir)
    calendar = client.earnings_calendar()
    ranked = sorted(scan.get("results", []), key=lambda item: item["rank"])
    candidates = []
    for result in ranked:
        checks = result.get("tradeReadiness", {}).get("automaticChecks", [])
        base_passed = all(
            check["passed"]
            for check in checks
            if check["id"] not in {"earnings_clear", "news_clear"}
        )
        if base_passed:
            candidates.append(result)
    news_symbols = {
        item["symbol"] for item in candidates[: args.max_news_symbols]
    }

    evidence = []
    for result in ranked:
        as_of = datetime.fromisoformat(result["asOf"]).date()
        close_et = datetime.combine(
            as_of, time(16, 0), tzinfo=ZoneInfo("America/New_York")
        )
        earnings = evaluate_earnings_calendar(
            result["symbol"], calendar, as_of
        )
        if result["symbol"] in news_symbols:
            try:
                news = evaluate_news(
                    result["symbol"],
                    client.news(result["symbol"], close_et),
                    close_et.astimezone(timezone.utc),
                )
            except (RuntimeError, ValueError, json.JSONDecodeError) as exc:
                news = {
                    "available": False,
                    "passed": False,
                    "reason": str(exc),
                    "source": "Alpha Vantage NEWS_SENTIMENT",
                }
        else:
            news = {
                "available": False,
                "passed": False,
                "reason": (
                    f"News requests limited to top {args.max_news_symbols} "
                    "base-qualified candidates"
                ),
                "source": "Alpha Vantage NEWS_SENTIMENT",
            }
        evidence.append(
            {"symbol": result["symbol"], "earnings": earnings, "news": news}
        )

    payload = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "scanAsOf": {
            item["symbol"]: item["asOf"] for item in ranked
        },
        "provider": "Alpha Vantage",
        "failClosed": True,
        "evidence": evidence,
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(
        json.dumps(
            {
                "provider": payload["provider"],
                "symbols": len(evidence),
                "news_checked": len(news_symbols),
                "output": str(args.output),
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
