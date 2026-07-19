from typing import Annotated

from fastapi import Depends
from healthgov.middleware import secure_app
from healthgov.security import Principal, require_roles
from pydantic import BaseModel, Field

app = secure_app("ml-security")


class ModelAssessment(BaseModel):
    model_id: str
    artifact_sha256: str = Field(pattern=r"^[a-f0-9]{64}$")
    dataset_version: str
    intended_use: str
    patient_population: list[str]
    subgroup_metrics: dict[str, float]
    drift_score: float = Field(ge=0)
    signed: bool
    sbom_present: bool
    human_oversight: bool


class AdversarialAssessment(BaseModel):
    model_id: str
    evasion_success_rate: float = Field(ge=0, le=1)
    extraction_risk: float = Field(ge=0, le=1)
    membership_inference_auc: float = Field(ge=0, le=1)
    unsafe_deserialization: bool
    prompt_injection_resistance: float | None = Field(default=None, ge=0, le=1)


class FederatedRound(BaseModel):
    federation_id: str
    round_number: int = Field(ge=1)
    participants: list[str] = Field(min_length=3)
    secure_aggregation: bool
    differential_privacy_epsilon: float = Field(gt=0, le=20)
    clipped_update_norm: float = Field(gt=0)
    anomalous_participants: list[str] = Field(default_factory=list)
    coordinator_attested: bool


@app.post("/v1/models/assess")
async def assess(
    body: ModelAssessment,
    _: Annotated[Principal, Depends(require_roles("ml_engineer", "clinical_safety", "quality"))],
):
    failures = []
    if not body.signed:
        failures.append("unsigned model artifact")
    if not body.sbom_present:
        failures.append("missing ML dependency SBOM")
    if not body.human_oversight:
        failures.append("clinical human oversight not documented")
    if body.drift_score > 0.15:
        failures.append("drift threshold exceeded")
    if any(metric < 0.75 for metric in body.subgroup_metrics.values()):
        failures.append("subgroup performance below approved threshold")
    return {"approved": not failures, "blocking_reasons": failures}


@app.post("/v1/models/adversarial-assess")
async def adversarial_assess(
    body: AdversarialAssessment,
    _: Annotated[Principal, Depends(require_roles("ml_engineer", "clinical_safety", "security"))],
):
    failures = []
    if body.evasion_success_rate > 0.05:
        failures.append("evasion success rate exceeds threshold")
    if body.extraction_risk > 0.10:
        failures.append("model extraction risk exceeds threshold")
    if body.membership_inference_auc > 0.60:
        failures.append("membership inference privacy risk exceeds threshold")
    if body.unsafe_deserialization:
        failures.append("unsafe model serialization format")
    return {"approved": not failures, "blocking_reasons": failures}


@app.post("/v1/federated/rounds/assess")
async def assess_federated_round(
    body: FederatedRound,
    _: Annotated[Principal, Depends(require_roles("ml_engineer", "privacy_officer"))],
):
    failures = []
    if not body.secure_aggregation:
        failures.append("secure aggregation required")
    if not body.coordinator_attested:
        failures.append("coordinator attestation required")
    if body.differential_privacy_epsilon > 8:
        failures.append("privacy budget exceeds approved maximum")
    if body.anomalous_participants:
        failures.append("anomalous participant updates require quarantine")
    return {"accepted": not failures, "blocking_reasons": failures}
