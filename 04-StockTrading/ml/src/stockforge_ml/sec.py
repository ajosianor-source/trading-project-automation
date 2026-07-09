from __future__ import annotations

import json
import re
import time
from dataclasses import asdict, dataclass
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


ANNUAL_FORMS = {"10-K", "10-K/A", "20-F", "20-F/A", "40-F", "40-F/A"}
REVENUE_TAGS = (
    "RevenueFromContractWithCustomerExcludingAssessedTax",
    "Revenues",
    "SalesRevenueNet",
    "RevenueFromContractWithCustomerIncludingAssessedTax",
)
CONCEPT_TAGS = {
    "net_income": ("NetIncomeLoss", "ProfitLoss"),
    "operating_income": ("OperatingIncomeLoss",),
    "operating_cash_flow": ("NetCashProvidedByUsedInOperatingActivities",),
    "capex": (
        "PaymentsToAcquirePropertyPlantAndEquipment",
        "PaymentsToAcquireOtherPropertyPlantAndEquipment",
        "PaymentsToAcquireProductiveAssets",
    ),
    "assets": ("Assets",),
    "liabilities": ("Liabilities",),
    "equity": (
        "StockholdersEquity",
        "StockholdersEquityIncludingPortionAttributableToNoncontrollingInterest",
    ),
}


@dataclass(frozen=True)
class FundamentalSnapshot:
    symbol: str
    cik: str
    company_name: str
    as_of: str
    filing_date: str
    fiscal_year: int | None
    fiscal_period_end: str
    accession_number: str
    revenue: float
    revenue_growth: float | None
    operating_margin: float | None
    net_margin: float | None
    free_cash_flow_margin: float | None
    liabilities_to_assets: float | None
    return_on_assets: float | None
    coverage: int
    source: str = "SEC EDGAR companyfacts"

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


def _parse_date(value: str) -> date:
    return date.fromisoformat(value[:10])


def _annual_facts(companyfacts: dict[str, Any], tag: str, as_of: date) -> list[dict]:
    concept = companyfacts.get("facts", {}).get("us-gaap", {}).get(tag, {})
    candidates: list[dict] = []
    for facts in concept.get("units", {}).values():
        for fact in facts:
            if (
                fact.get("form") in ANNUAL_FORMS
                and fact.get("filed")
                and _parse_date(fact["filed"]) <= as_of
                and isinstance(fact.get("val"), (int, float))
            ):
                candidates.append(fact)
    return candidates


def _duration_days(fact: dict) -> int | None:
    if not fact.get("start") or not fact.get("end"):
        return None
    return (_parse_date(fact["end"]) - _parse_date(fact["start"])).days


def _select_duration_fact(
    companyfacts: dict[str, Any],
    tags: tuple[str, ...],
    as_of: date,
    fiscal_year: int | None = None,
    period_end: str | None = None,
) -> tuple[dict | None, str | None]:
    for tag in tags:
        facts = [
            fact
            for fact in _annual_facts(companyfacts, tag, as_of)
            if (days := _duration_days(fact)) is not None and 270 <= days <= 430
        ]
        if fiscal_year is not None:
            aligned = [fact for fact in facts if fact.get("fy") == fiscal_year]
            if aligned:
                facts = aligned
        if period_end:
            aligned = [fact for fact in facts if fact.get("end") == period_end]
            if aligned:
                facts = aligned
        if facts:
            return max(
                facts,
                key=lambda fact: (
                    fact.get("end", ""),
                    fact.get("filed", ""),
                    fact.get("accn", ""),
                ),
            ), tag
    return None, None


def _select_instant_fact(
    companyfacts: dict[str, Any],
    tags: tuple[str, ...],
    as_of: date,
    fiscal_year: int | None,
    period_end: str,
) -> tuple[dict | None, str | None]:
    for tag in tags:
        facts = [
            fact
            for fact in _annual_facts(companyfacts, tag, as_of)
            if not fact.get("start")
        ]
        exact = [
            fact
            for fact in facts
            if fact.get("end") == period_end
            and (fiscal_year is None or fact.get("fy") == fiscal_year)
        ]
        if exact:
            return max(
                exact, key=lambda fact: (fact.get("filed", ""), fact.get("accn", ""))
            ), tag
    return None, None


def _ratio(numerator: float | None, denominator: float | None) -> float | None:
    if numerator is None or denominator in (None, 0):
        return None
    return numerator / denominator


def extract_fundamental_snapshot(
    symbol: str,
    cik: str,
    companyfacts: dict[str, Any],
    as_of: date | str,
) -> FundamentalSnapshot | None:
    """Build a filing-time snapshot using only facts filed on or before as_of."""
    cutoff = _parse_date(as_of) if isinstance(as_of, str) else as_of
    revenue_fact, _ = _select_duration_fact(
        companyfacts, REVENUE_TAGS, cutoff
    )
    if not revenue_fact:
        return None

    period_end = revenue_fact["end"]
    fiscal_year = revenue_fact.get("fy")
    prior_candidates: list[dict] = []
    for tag in REVENUE_TAGS:
        prior_candidates.extend(
            fact
            for fact in _annual_facts(companyfacts, tag, cutoff)
            if (days := _duration_days(fact)) is not None
            and 270 <= days <= 430
            and fact.get("end", "") < period_end
        )
    prior_fact = (
        max(prior_candidates, key=lambda fact: (fact.get("end", ""), fact.get("filed", "")))
        if prior_candidates
        else None
    )

    values: dict[str, float | None] = {}
    used_facts: list[dict] = [revenue_fact]
    for name in ("net_income", "operating_income", "operating_cash_flow", "capex"):
        fact, _ = _select_duration_fact(
            companyfacts, CONCEPT_TAGS[name], cutoff, fiscal_year, period_end
        )
        values[name] = float(fact["val"]) if fact else None
        if fact:
            used_facts.append(fact)
    for name in ("assets", "liabilities", "equity"):
        fact, _ = _select_instant_fact(
            companyfacts, CONCEPT_TAGS[name], cutoff, fiscal_year, period_end
        )
        values[name] = float(fact["val"]) if fact else None
        if fact:
            used_facts.append(fact)
    if (
        values["liabilities"] is None
        and values["assets"] is not None
        and values["equity"] is not None
        and values["assets"] >= values["equity"]
    ):
        values["liabilities"] = values["assets"] - values["equity"]

    revenue = float(revenue_fact["val"])
    prior_revenue = float(prior_fact["val"]) if prior_fact else None
    operating_cash_flow = values["operating_cash_flow"]
    capex = values["capex"]
    free_cash_flow = (
        operating_cash_flow - capex
        if operating_cash_flow is not None and capex is not None
        else None
    )
    metrics = {
        "revenue_growth": _ratio(
            revenue - prior_revenue if prior_revenue is not None else None,
            prior_revenue,
        ),
        "operating_margin": _ratio(values["operating_income"], revenue),
        "net_margin": _ratio(values["net_income"], revenue),
        "free_cash_flow_margin": _ratio(free_cash_flow, revenue),
        "liabilities_to_assets": _ratio(values["liabilities"], values["assets"]),
        "return_on_assets": _ratio(values["net_income"], values["assets"]),
    }
    coverage = sum(value is not None for value in metrics.values())
    filing_date = max(fact["filed"] for fact in used_facts if fact.get("filed"))
    return FundamentalSnapshot(
        symbol=symbol.upper(),
        cik=str(cik).zfill(10),
        company_name=companyfacts.get("entityName", symbol.upper()),
        as_of=cutoff.isoformat(),
        filing_date=filing_date,
        fiscal_year=fiscal_year,
        fiscal_period_end=period_end,
        accession_number=revenue_fact.get("accn", ""),
        revenue=revenue,
        coverage=coverage,
        **metrics,
    )


def validate_user_agent(user_agent: str) -> str:
    value = user_agent.strip()
    if not re.search(r"\S+@\S+\.\S+", value) or len(value.split()) < 2:
        raise ValueError(
            "SEC_USER_AGENT must identify the app and include a real contact email, "
            'for example "StockForge you@example.com".'
        )
    return value


class SecClient:
    def __init__(
        self,
        user_agent: str,
        cache_dir: Path,
        cache_hours: float = 24,
        minimum_interval: float = 0.12,
    ) -> None:
        self.user_agent = validate_user_agent(user_agent)
        self.cache_dir = Path(cache_dir)
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        self.cache_hours = cache_hours
        self.minimum_interval = max(0.11, minimum_interval)
        self._last_request = 0.0

    def _get_json(self, url: str, cache_name: str) -> dict[str, Any]:
        path = self.cache_dir / cache_name
        if path.exists():
            age_hours = (time.time() - path.stat().st_mtime) / 3600
            if age_hours <= self.cache_hours:
                return json.loads(path.read_text(encoding="utf-8"))
        delay = self.minimum_interval - (time.monotonic() - self._last_request)
        if delay > 0:
            time.sleep(delay)
        request = Request(
            url,
            headers={
                "User-Agent": self.user_agent,
                "Accept-Encoding": "identity",
                "Host": url.split("/")[2],
            },
        )
        try:
            with urlopen(request, timeout=30) as response:
                payload = json.loads(response.read().decode("utf-8"))
        except (HTTPError, URLError) as exc:
            raise RuntimeError(f"SEC request failed for {url}: {exc}") from exc
        finally:
            self._last_request = time.monotonic()
        path.write_text(json.dumps(payload), encoding="utf-8")
        return payload

    def ticker_map(self) -> dict[str, str]:
        payload = self._get_json(
            "https://www.sec.gov/files/company_tickers.json", "company_tickers.json"
        )
        return {
            item["ticker"].upper(): str(item["cik_str"]).zfill(10)
            for item in payload.values()
        }

    def companyfacts(self, cik: str) -> dict[str, Any]:
        padded = str(cik).zfill(10)
        return self._get_json(
            f"https://data.sec.gov/api/xbrl/companyfacts/CIK{padded}.json",
            f"companyfacts-CIK{padded}.json",
        )

    def snapshots(
        self, symbols: list[str], as_of: date | None = None
    ) -> tuple[list[FundamentalSnapshot], list[dict[str, str]]]:
        cutoff = as_of or datetime.now(timezone.utc).date()
        ticker_map = self.ticker_map()
        snapshots: list[FundamentalSnapshot] = []
        errors: list[dict[str, str]] = []
        for symbol in symbols:
            normalized = symbol.upper()
            cik = ticker_map.get(normalized)
            if not cik:
                errors.append({"symbol": normalized, "error": "No SEC CIK mapping"})
                continue
            try:
                snapshot = extract_fundamental_snapshot(
                    normalized, cik, self.companyfacts(cik), cutoff
                )
                if snapshot:
                    snapshots.append(snapshot)
                else:
                    errors.append(
                        {"symbol": normalized, "error": "No eligible annual facts"}
                    )
            except (RuntimeError, ValueError, KeyError) as exc:
                errors.append({"symbol": normalized, "error": str(exc)})
        return snapshots, errors
