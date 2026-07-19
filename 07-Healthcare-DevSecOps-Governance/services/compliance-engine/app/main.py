from datetime import UTC, datetime
from typing import Annotated, Any

import httpx
from fastapi import Depends, HTTPException
from healthgov.config import get_settings
from healthgov.middleware import secure_app
from healthgov.security import Principal, require_roles
from pydantic import BaseModel, Field

app = secure_app("compliance-engine")


@app.get("/v1/posture")
async def posture(
    principal: Annotated[
        Principal, Depends(require_roles("compliance", "auditor", "executive", "security"))
    ],
):
    return {
        "tenant_id": principal.tenant_id,
        "frameworks": [],
        "overall_score": 0,
        "evidence_freshness": 0,
        "drift_count": 0,
    }


class EvaluationRequest(BaseModel):
    policy_path: str = Field(pattern=r"^[a-z0-9_/-]+$")
    input: dict[str, Any]


class EvaluationResult(BaseModel):
    allowed: bool
    violations: list[str]


class EvidenceObservation(BaseModel):
    framework: str = Field(
        pattern=r"^(HIPAA|GDPR|NHS_DSPT|ISO27001|SOC2|FDA_21_CFR_11|ISO13485|ISO14971)$"
    )
    control_id: str = Field(max_length=80)
    collector: str = Field(max_length=120)
    artifact_sha256: str = Field(pattern=r"^[a-f0-9]{64}$")
    status: str = Field(pattern=r"^(effective|partial|ineffective|not_applicable)$")
    observed_at: datetime
    expires_at: datetime


class DriftRequest(BaseModel):
    baseline: dict[str, str]
    current: dict[str, str]


@app.post("/v1/evaluate", response_model=EvaluationResult)
async def evaluate(
    body: EvaluationRequest,
    _: Annotated[Principal, Depends(require_roles("developer", "security", "compliance"))],
):
    url = f"{str(get_settings().opa_url).rstrip('/')}/v1/data/{body.policy_path}"
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            response = await client.post(url, json={"input": body.input})
            response.raise_for_status()
            decision = response.json().get("result", {})
    except (httpx.HTTPError, ValueError) as exc:
        raise HTTPException(status_code=503, detail="Policy engine unavailable") from exc
    violations = decision.get("violations", [])
    return EvaluationResult(allowed=decision.get("allow", not violations), violations=violations)


@app.post("/v1/evidence", status_code=202)
async def collect_evidence(
    body: EvidenceObservation,
    principal: Annotated[Principal, Depends(require_roles("service", "compliance", "auditor"))],
):
    # Artifacts stay in immutable object storage; the control plane persists hashes and lineage.
    return {
        "accepted": True,
        "tenant_id": principal.tenant_id,
        "framework": body.framework,
        "control_id": body.control_id,
        "fresh": body.expires_at > datetime.now(UTC),
    }


@app.post("/v1/drift/detect")
async def detect_drift(
    body: DriftRequest,
    _: Annotated[Principal, Depends(require_roles("service", "compliance", "security"))],
):
    keys = set(body.baseline) | set(body.current)
    drift = [
        {"control_id": key, "expected": body.baseline.get(key), "actual": body.current.get(key)}
        for key in sorted(keys)
        if body.baseline.get(key) != body.current.get(key)
    ]
    return {"drifted": bool(drift), "changes": drift, "score_impact": min(len(drift) * 2, 100)}


@app.post("/v1/posture/score")
async def posture_score(
    evidence: list[EvidenceObservation],
    _: Annotated[Principal, Depends(require_roles("compliance", "auditor", "executive"))],
):
    weights = {"effective": 1.0, "partial": 0.5, "ineffective": 0.0, "not_applicable": 1.0}
    score = round(sum(weights[item.status] for item in evidence) / max(len(evidence), 1) * 100, 1)
    return {"score": score, "evidence_count": len(evidence), "continuous": True}
