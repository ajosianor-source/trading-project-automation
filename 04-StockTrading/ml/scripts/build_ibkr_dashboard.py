from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

import numpy as np
import pandas as pd

from stockforge_ml.features import FEATURE_COLUMNS, engineer_features
from stockforge_ml.readiness import build_trade_readiness


def clamp(value: float, low: float = 0.0, high: float = 100.0) -> float:
    return max(low, min(high, value))


def scale(value: float, bad: float, good: float) -> float:
    if good == bad:
        return 0.0
    return clamp((value - bad) / (good - bad) * 100)


def technical_score(row: pd.Series) -> float:
    trend = (
        (25 if row["sma_gap_20"] > 0 else 0)
        + (30 if row["sma_gap_50"] > 0 else 0)
        + (45 if row["sma_gap_200"] > 0 else 0)
    )
    momentum = scale(row["return_63"], -0.15, 0.30)
    rsi = (
        100
        if 45 <= row["rsi_14"] <= 68
        else 20
        if row["rsi_14"] > 75 or row["rsi_14"] < 30
        else 60
    )
    volume = scale(row["volume_z_20"], -1.0, 2.0)
    relative = scale(row["relative_strength_21"], -0.10, 0.15)
    return trend * 0.42 + momentum * 0.28 + rsi * 0.10 + volume * 0.08 + relative * 0.12


def risk_quality_score(row: pd.Series, minimum_dollar_volume: float) -> float:
    liquidity = scale(
        row["dollar_volume_20"],
        minimum_dollar_volume,
        minimum_dollar_volume * 10,
    )
    volatility = 100 - scale(row["volatility_20"], 0.18, 0.65)
    drawdown = 100 - scale(abs(row["drawdown_63"]), 0.05, 0.35)
    atr = 100 - scale(row["atr_percent_14"], 0.012, 0.065)
    return liquidity * 0.30 + volatility * 0.30 + drawdown * 0.25 + atr * 0.15


def fundamental_score(fundamental: dict) -> float:
    definitions = [
        ("revenue_growth", -0.05, 0.20, 0.25, False),
        ("operating_margin", 0.05, 0.30, 0.20, False),
        ("net_margin", 0.03, 0.25, 0.15, False),
        ("free_cash_flow_margin", 0.00, 0.20, 0.20, False),
        ("liabilities_to_assets", 0.35, 0.85, 0.10, True),
        ("return_on_assets", 0.02, 0.15, 0.10, False),
    ]
    available = []
    for key, bad, good, weight, invert in definitions:
        value = fundamental[key]
        if np.isnan(value):
            continue
        score = scale(value, bad, good)
        available.append((100 - score if invert else score, weight))
    weight = sum(item[1] for item in available)
    return sum(score * item_weight for score, item_weight in available) / weight


def optional_number(value) -> float:
    return float(value) if value is not None else np.nan


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Build StockForge dashboard rankings from IBKR and optional SEC data."
    )
    parser.add_argument("--bars", type=Path, default=Path("data/ibkr-daily-bars.csv"))
    parser.add_argument(
        "--config",
        type=Path,
        default=Path("../config/stocks.example.json"),
    )
    parser.add_argument(
        "--metadata",
        type=Path,
        default=Path("data/ibkr-instruments.json"),
    )
    parser.add_argument(
        "--fundamentals",
        type=Path,
        default=Path("data/sec-fundamentals.json"),
    )
    parser.add_argument(
        "--history",
        type=Path,
        default=Path("data/trading-history.json"),
    )
    parser.add_argument(
        "--evidence",
        type=Path,
        default=Path("data/market-evidence.json"),
    )
    parser.add_argument(
        "--dashboard-js",
        type=Path,
        default=Path("../dashboard/scan-data.js"),
    )
    parser.add_argument(
        "--output-json",
        type=Path,
        default=Path("../data/latest-scan.json"),
    )
    args = parser.parse_args()

    config = json.loads(args.config.read_text(encoding="utf-8-sig"))
    metadata_payload = (
        json.loads(args.metadata.read_text(encoding="utf-8-sig"))
        if args.metadata.exists()
        else {"instruments": []}
    )
    metadata = {
        item["symbol"]: item for item in metadata_payload.get("instruments", [])
    }
    fundamental_payload = (
        json.loads(args.fundamentals.read_text(encoding="utf-8-sig"))
        if args.fundamentals.exists()
        else {"fundamentals": []}
    )
    fundamentals = {
        item["symbol"]: item
        for item in fundamental_payload.get("fundamentals", [])
        if item.get("coverage", 0) >= 4
    }
    trading_history = (
        json.loads(args.history.read_text(encoding="utf-8-sig"))
        if args.history.exists()
        else {
            "source": "IBKR paper executions (no journal yet)",
            "statistics": {
                "executionCount": 0,
                "closedTradeCount": 0,
                "winRatePercent": None,
                "realizedPnl": 0,
                "averageTradePnl": None,
                "profitFactor": None,
            },
            "closedTrades": [],
            "openPositions": [],
            "unmatchedSells": [],
        }
    )
    evidence_payload = (
        json.loads(args.evidence.read_text(encoding="utf-8-sig"))
        if args.evidence.exists()
        else {"evidence": []}
    )
    evidence_by_symbol = {
        item["symbol"]: item for item in evidence_payload.get("evidence", [])
    }
    bars = pd.read_csv(args.bars, dtype={"timestamp": str})
    bars["timestamp"] = pd.to_datetime(
        bars["timestamp"], format="mixed", utc=True
    )
    features = engineer_features(bars, benchmark=config["benchmark"]).dropna(
        subset=FEATURE_COLUMNS
    )
    latest = (
        features.sort_values("timestamp")
        .groupby("symbol", as_index=False)
        .tail(1)
        .set_index("symbol")
    )
    benchmark = latest.loc[config["benchmark"]]
    regime_score = 100.0 if benchmark["sma_gap_200"] > 0 else 20.0
    market_regime = "risk-on" if regime_score >= 50 else "risk-off"
    minimum_liquidity = float(
        config["portfolio"]["minimumAverageDollarVolume"]
    )
    account_value = float(config["portfolio"]["accountValue"])
    risk_budget = account_value * float(
        config["portfolio"]["riskPerTradePercent"]
    ) / 100
    max_position = account_value * float(
        config["portfolio"]["maxPositionPercent"]
    ) / 100
    stop_multiple = float(config["portfolio"]["atrStopMultiple"])
    now = datetime.now(timezone.utc)
    try:
        evidence_generated = datetime.fromisoformat(
            evidence_payload.get("generatedAt", "")
        )
        evidence_is_fresh = (
            evidence_generated.tzinfo is not None
            and (now - evidence_generated).total_seconds() <= 18 * 3600
        )
    except ValueError:
        evidence_is_fresh = False
    eastern_now = now.astimezone(ZoneInfo("America/New_York"))
    results = []

    for symbol in config["universe"]:
        if symbol not in latest.index:
            continue
        row = latest.loc[symbol]
        tech = technical_score(row)
        risk = risk_quality_score(row, minimum_liquidity)
        fundamental = fundamentals.get(symbol)
        fund = None
        if fundamental:
            normalized = {
                key: optional_number(fundamental.get(key))
                for key in (
                    "revenue_growth",
                    "operating_margin",
                    "net_margin",
                    "free_cash_flow_margin",
                    "liabilities_to_assets",
                    "return_on_assets",
                )
            }
            fund = fundamental_score(normalized)
            total = (
                tech * 35 + fund * 30 + risk * 20 + regime_score * 5
            ) / 90
        else:
            total = (tech * 65 + risk * 30 + regime_score * 5) / 100
        timestamp = pd.Timestamp(row["timestamp"]).to_pydatetime()
        if fundamental and fundamental.get("filing_date"):
            if fundamental["filing_date"] > timestamp.date().isoformat():
                fundamental = None
                fund = None
                total = (tech * 65 + risk * 30 + regime_score * 5) / 100
        age_hours = (now - timestamp).total_seconds() / 3600
        data_fresh = age_hours <= float(
            config["selection"]["maximumDataAgeHours"]
        )
        completed_daily_bar = (
            timestamp.date() < eastern_now.date()
            or (
                timestamp.date() == eastern_now.date()
                and (eastern_now.hour, eastern_now.minute) >= (16, 15)
            )
        )
        eligible = (
            total >= float(config["selection"]["minimumScore"])
            and row["volatility_20"]
            <= float(config["selection"]["maximumAnnualizedVolatility"])
            and row["dollar_volume_20"] >= minimum_liquidity
            and data_fresh
            and (not fundamentals or fundamental is not None)
        )
        price = float(row["close"])
        atr = float(row["atr_percent_14"] * price)
        stop_distance = atr * stop_multiple
        shares_by_risk = int(risk_budget // stop_distance) if stop_distance else 0
        shares_by_cap = int(max_position // price) if price else 0
        shares = max(0, min(shares_by_risk, shares_by_cap))
        symbol_evidence = evidence_by_symbol.get(symbol, {})
        evidence_matches_scan = (
            evidence_is_fresh
            and evidence_payload.get("scanAsOf", {}).get(symbol)
            == timestamp.date().isoformat()
        )
        if evidence_matches_scan:
            earnings_evidence = symbol_evidence.get("earnings", {})
            news_evidence = symbol_evidence.get("news", {})
        else:
            reason = (
                "Evidence is stale or does not match the latest market-data session"
                if symbol_evidence
                else "Automated evidence has not been fetched"
            )
            earnings_evidence = {
                "available": False,
                "passed": False,
                "reason": reason,
            }
            news_evidence = {
                "available": False,
                "passed": False,
                "reason": reason,
            }
        news_sentiment_score = (
            clamp(
                (float(news_evidence.get("averageTickerSentiment", 0)) + 1)
                * 50
            )
            if news_evidence.get("available")
            else None
        )
        trade_readiness = build_trade_readiness(
            eligible=bool(eligible),
            market_regime=market_regime,
            score=total,
            fundamental_score=fund,
            risk_quality_score=risk,
            data_fresh=data_fresh,
            completed_daily_bar=completed_daily_bar,
            earnings_evidence=earnings_evidence,
            news_evidence=news_evidence,
        )
        reasons = []
        if row["sma_gap_200"] > 0:
            reasons.append("Price is above its 200-day moving average")
        if row["return_63"] > 0.10:
            reasons.append("Three-month momentum exceeds 10%")
        if row["relative_strength_21"] > 0:
            reasons.append("One-month performance exceeds SPY")
        if row["volatility_20"] > 0.65:
            reasons.append("Volatility exceeds the configured ceiling")
        if row["dollar_volume_20"] < minimum_liquidity:
            reasons.append("Liquidity is below the configured minimum")
        if age_hours > float(config["selection"]["maximumDataAgeHours"]):
            reasons.append("Data is older than the configured freshness limit")
        if fundamental:
            revenue_growth = optional_number(fundamental.get("revenue_growth"))
            fcf_margin = optional_number(
                fundamental.get("free_cash_flow_margin")
            )
            leverage = optional_number(
                fundamental.get("liabilities_to_assets")
            )
            if not np.isnan(revenue_growth):
                reasons.append(
                    f"Annual revenue growth was {revenue_growth * 100:.1f}%"
                )
            if not np.isnan(fcf_margin):
                reasons.append(
                    f"Free-cash-flow margin was {fcf_margin * 100:.1f}%"
                )
            if not np.isnan(leverage):
                reasons.append(
                    f"Liabilities were {leverage * 100:.1f}% of assets"
                )
            reasons.append(
                f"SEC annual facts were filed {fundamental['filing_date']} "
                f"for fiscal {fundamental.get('fiscal_year', 'year')}"
            )
        else:
            reasons.append(
                "Point-in-time SEC fundamentals are unavailable; score uses market factors only"
            )
        reasons.append("News sentiment is not included in this scan")

        results.append(
            {
                "symbol": symbol,
                "name": metadata.get(symbol, {}).get("name", symbol),
                "industry": metadata.get(symbol, {}).get("industry", ""),
                "category": metadata.get(symbol, {}).get("category", ""),
                "eligible": bool(eligible),
                "score": round(total, 2),
                "rank": 0,
                "price": round(price, 2),
                "asOf": timestamp.date().isoformat(),
                "dataSource": (
                    "IBKR PAPER HISTORICAL + SEC EDGAR"
                    if fundamental
                    else "IBKR PAPER HISTORICAL - MARKET FACTORS ONLY"
                ),
                "componentScores": {
                    "technical": round(tech, 1),
                    "fundamental": round(fund, 1) if fund is not None else None,
                    "riskQuality": round(risk, 1),
                    "sentiment": (
                        round(news_sentiment_score, 1)
                        if news_sentiment_score is not None
                        else None
                    ),
                    "marketRegime": round(regime_score, 1),
                },
                "metrics": {
                    "rsi14": round(float(row["rsi_14"]), 1),
                    "momentum3MonthPercent": round(
                        float(row["return_63"]) * 100, 1
                    ),
                    "annualizedVolatilityPercent": round(
                        float(row["volatility_20"]) * 100, 1
                    ),
                    "averageDollarVolume": round(
                        float(row["dollar_volume_20"])
                    ),
                    "dataAgeHours": round(age_hours, 1),
                    "revenueGrowthPercent": (
                        round(optional_number(fundamental.get("revenue_growth")) * 100, 1)
                        if fundamental
                        and not np.isnan(optional_number(fundamental.get("revenue_growth")))
                        else None
                    ),
                    "operatingMarginPercent": (
                        round(optional_number(fundamental.get("operating_margin")) * 100, 1)
                        if fundamental
                        and not np.isnan(optional_number(fundamental.get("operating_margin")))
                        else None
                    ),
                    "freeCashFlowMarginPercent": (
                        round(optional_number(fundamental.get("free_cash_flow_margin")) * 100, 1)
                        if fundamental
                        and not np.isnan(optional_number(fundamental.get("free_cash_flow_margin")))
                        else None
                    ),
                    "liabilitiesToAssetsPercent": (
                        round(optional_number(fundamental.get("liabilities_to_assets")) * 100, 1)
                        if fundamental
                        and not np.isnan(optional_number(fundamental.get("liabilities_to_assets")))
                        else None
                    ),
                    "fundamentalsFiled": (
                        fundamental.get("filing_date") if fundamental else None
                    ),
                    "fiscalYear": (
                        fundamental.get("fiscal_year") if fundamental else None
                    ),
                },
                "riskPlan": {
                    "direction": "LONG",
                    "suggestedShares": shares,
                    "estimatedPositionValue": round(shares * price, 2),
                    "initialStop": round(max(0.01, price - stop_distance), 2),
                    "provisionalTwoRTarget": round(
                        price + 2 * stop_distance, 2
                    ),
                    "riskBudget": round(risk_budget, 2),
                },
                "tradeAction": (
                    "PAPER BUY SETUP"
                    if trade_readiness["paperTradeReady"]
                    else "NO TRADE"
                ),
                "tradeReadiness": trade_readiness,
                "marketEvidence": {
                    "fresh": evidence_matches_scan,
                    "checkedAt": evidence_payload.get("generatedAt"),
                    "earnings": earnings_evidence,
                    "news": news_evidence,
                },
                "reasons": reasons,
            }
        )

    results.sort(key=lambda item: item["score"], reverse=True)
    for index, result in enumerate(results, start=1):
        result["rank"] = index
    eligible_results = [result for result in results if result["eligible"]]
    best = eligible_results[0]["symbol"] if eligible_results else None
    payload = {
        "generatedAt": now.isoformat(),
        "mode": "paper-research",
        "provider": (
            "IBKR PAPER HISTORICAL + SEC EDGAR"
            if fundamentals
            else "IBKR PAPER HISTORICAL - MARKET FACTORS ONLY"
        ),
        "benchmark": config["benchmark"],
        "marketRegime": market_regime,
        "orderRoutingEnabled": False,
        "recommendation": best,
        "recommendationMeaning": (
            "Highest-ranked technical, SEC-fundamental, and risk candidate for news review; not an instruction to buy."
            if best and fundamentals
            else "Highest-ranked market-factor candidate for fundamental and news review; not an instruction to buy."
            if best
            else "No stock passed every configured market-data and risk gate."
        ),
        "missingEvidence": (
            ([] if evidence_is_fresh else ["earnings calendar", "news sentiment"])
            + ([] if fundamentals else ["fundamentals"])
        ),
        "fundamentalCoverage": {
            "available": len(fundamentals),
            "universe": len(config["universe"]),
            "pointInTime": bool(fundamental_payload.get("pointInTime", False)),
            "asOf": fundamental_payload.get("asOf"),
        },
        "tradingHistory": trading_history,
        "results": results,
    }
    serialized = json.dumps(payload, indent=2, allow_nan=False)
    args.output_json.parent.mkdir(parents=True, exist_ok=True)
    args.dashboard_js.parent.mkdir(parents=True, exist_ok=True)
    args.output_json.write_text(serialized, encoding="utf-8")
    args.dashboard_js.write_text(
        f"window.STOCK_FORGE_SCAN = {serialized};\n", encoding="utf-8"
    )
    print(
        json.dumps(
            {
                "provider": payload["provider"],
                "results": len(results),
                "eligible": len(eligible_results),
                "top_review_candidate": best,
                "orders_enabled": False,
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
