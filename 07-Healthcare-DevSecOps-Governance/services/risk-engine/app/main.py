from enum import StrEnum
from typing import Annotated

from fastapi import Depends
from healthgov.middleware import secure_app
from healthgov.security import Principal, require_roles
from pydantic import BaseModel, Field

app = secure_app("risk-engine")


@app.get("/v1/risks")
async def list_risks(
    principal: Annotated[
        Principal, Depends(require_roles("risk_manager", "security", "executive", "auditor"))
    ],
):
    return {"tenant_id": principal.tenant_id, "items": [], "total": 0, "heatmap": []}


class Method(StrEnum):
    stride = "STRIDE"
    linddun = "LINDDUN"
    iso14971 = "ISO14971"


class RiskInput(BaseModel):
    asset: str
    method: Method
    severity: int = Field(ge=1, le=5)
    likelihood: int = Field(ge=1, le=5)
    detectability: int = Field(default=1, ge=1, le=5)
    controls: list[str]
    clinical_harm: str | None = None


class Component(BaseModel):
    name: str
    kind: str = Field(pattern=r"^(process|data_store|external_entity|data_flow)$")
    handles_phi: bool = False
    crosses_trust_boundary: bool = False
    user_linkable: bool = False


class ThreatModelRequest(BaseModel):
    system_name: str
    components: list[Component] = Field(min_length=1, max_length=200)


class StakeholderRisk(BaseModel):
    phi_exposure: int = Field(ge=0, le=100)
    iomt_device: int = Field(ge=0, le=100)
    fhir_sensitivity: int = Field(ge=0, le=100)
    model_risk: int = Field(ge=0, le=100)
    compliance_gap: int = Field(ge=0, le=100)
    likelihood: int = Field(ge=1, le=5)
    impact: int = Field(ge=1, le=5)
    verified_controls: int = Field(default=0, ge=0, le=20)


@app.post("/v1/risks/score")
async def score(
    risk: RiskInput,
    _: Annotated[Principal, Depends(require_roles("risk_manager", "security", "quality"))],
):
    inherent = risk.severity * risk.likelihood * risk.detectability
    reduction = min(len(set(risk.controls)) * 0.08, 0.64)
    residual = max(1, round(inherent * (1 - reduction)))
    return {
        "inherent_score": inherent,
        "residual_score": residual,
        "acceptance_required": residual >= 10 or risk.severity >= 5,
        "control_effectiveness_assumed": reduction,
        "note": "Control effectiveness must be verified with objective evidence.",
    }


@app.post("/v1/threat-models/generate")
async def generate_threat_model(
    body: ThreatModelRequest,
    _: Annotated[Principal, Depends(require_roles("risk_manager", "security", "privacy_officer"))],
):
    findings = []
    for component in body.components:
        if component.kind in {"process", "external_entity"}:
            findings.extend(["STRIDE:Spoofing", "STRIDE:ElevationOfPrivilege"])
        if component.kind in {"process", "data_store", "data_flow"}:
            findings.extend(["STRIDE:Tampering", "STRIDE:InformationDisclosure"])
        if component.crosses_trust_boundary:
            findings.extend(["STRIDE:Repudiation", "STRIDE:DenialOfService"])
        if component.handles_phi:
            findings.extend(["LINDDUN:Disclosure", "LINDDUN:PolicyNonCompliance"])
        if component.user_linkable:
            findings.extend(["LINDDUN:Linkability", "LINDDUN:Identifiability"])
    return {
        "system": body.system_name,
        "findings": sorted(set(findings)),
        "status": "draft",
        "human_review_required": True,
    }


@app.post("/v1/risks/stakeholder-score")
async def stakeholder_score(
    body: StakeholderRisk,
    _: Annotated[Principal, Depends(require_roles("risk_manager", "security", "executive"))],
):
    domain = round(
        body.phi_exposure * 0.3
        + body.iomt_device * 0.2
        + body.fhir_sensitivity * 0.15
        + body.model_risk * 0.15
        + body.compliance_gap * 0.2,
        1,
    )
    matrix = body.likelihood * body.impact
    control_reduction = min(body.verified_controls * 0.03, 0.45)
    residual = round(domain * (1 - control_reduction), 1)
    return {
        "inherent_score": domain,
        "residual_score": residual,
        "likelihood_impact": matrix,
        "tier": "critical"
        if residual >= 75
        else "high"
        if residual >= 50
        else "medium"
        if residual >= 25
        else "low",
        "heatmap": {"x": body.likelihood, "y": body.impact, "value": matrix},
        "human_acceptance_required": residual >= 50 or body.impact == 5,
    }
