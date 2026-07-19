from enum import StrEnum
from typing import Annotated

from fastapi import Depends
from healthgov.middleware import secure_app
from healthgov.security import Principal, require_roles
from pydantic import BaseModel, Field

app = secure_app("cicd-orchestrator")


class GateStatus(StrEnum):
    passed = "passed"
    failed = "failed"
    pending = "pending"


class Gate(BaseModel):
    name: str
    status: GateStatus
    critical_findings: int = Field(ge=0)


class ReleaseAssessment(BaseModel):
    repository: str
    commit_sha: str = Field(pattern=r"^[a-f0-9]{40}$")
    gates: list[Gate]
    artifact_signed: bool
    provenance_verified: bool


@app.post("/v1/releases/assess")
async def assess_release(
    body: ReleaseAssessment,
    _: Annotated[Principal, Depends(require_roles("developer", "security", "release_manager"))],
):
    required = {"semgrep", "snyk", "trivy", "checkov", "zap", "opa"}
    reported = {gate.name for gate in body.gates}
    failures = [
        gate.name
        for gate in body.gates
        if gate.status != GateStatus.passed or gate.critical_findings > 0
    ]
    missing = sorted(required - reported)
    approved = not failures and not missing and body.artifact_signed and body.provenance_verified
    return {
        "approved": approved,
        "blocking_reasons": [
            *[f"failed gate: {name}" for name in failures],
            *[f"missing gate: {name}" for name in missing],
            *(["artifact is unsigned"] if not body.artifact_signed else []),
            *(["provenance is unverified"] if not body.provenance_verified else []),
        ],
    }
