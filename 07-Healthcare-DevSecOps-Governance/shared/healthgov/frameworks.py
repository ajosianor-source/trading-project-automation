from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any


@dataclass(frozen=True)
class Control:
    control_id: str
    domain: str
    title: str
    evidence: tuple[str, ...]
    weight: float = 1.0
    mandatory: bool = True


STATUS_WEIGHT = {"effective": 1.0, "partial": 0.5, "ineffective": 0.0, "not_applicable": 1.0}


def score_controls(controls: tuple[Control, ...], evidence: list[dict[str, Any]]) -> dict[str, Any]:
    latest: dict[str, dict[str, Any]] = {}
    for item in sorted(evidence, key=lambda row: str(row.get("observed_at", ""))):
        latest[str(item["control_id"])] = item
    earned = total = 0.0
    missing: list[str] = []
    stale: list[str] = []
    now = datetime.now(UTC)
    for control in controls:
        total += control.weight
        observation = latest.get(control.control_id)
        if not observation:
            missing.append(control.control_id)
            continue
        expires = observation.get("expires_at")
        if isinstance(expires, datetime) and expires < now:
            stale.append(control.control_id)
            continue
        earned += control.weight * STATUS_WEIGHT.get(str(observation.get("status")), 0.0)
    score = round(100 * earned / total, 1) if total else 0.0
    return {
        "score": score,
        "controls": len(controls),
        "effective_weight": round(earned, 3),
        "total_weight": round(total, 3),
        "missing_controls": missing,
        "stale_controls": stale,
        "ready": score >= 90 and not missing and not stale,
    }


def serialize_controls(controls: tuple[Control, ...]) -> list[dict[str, Any]]:
    return [
        {
            "control_id": item.control_id,
            "domain": item.domain,
            "title": item.title,
            "evidence_requirements": list(item.evidence),
            "weight": item.weight,
            "mandatory": item.mandatory,
        }
        for item in controls
    ]
