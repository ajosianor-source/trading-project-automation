import hashlib
import json
from datetime import UTC, datetime
from typing import Annotated

from fastapi import Depends
from healthgov.middleware import secure_app
from healthgov.security import Principal, require_roles
from pydantic import BaseModel, Field

app = secure_app("reporting-service")


class Evidence(BaseModel):
    framework: str
    control_id: str
    status: str = Field(pattern=r"^(effective|partial|ineffective|not_applicable)$")
    artifact_sha256: str = Field(pattern=r"^[a-f0-9]{64}$")
    observed_at: datetime


class ReportRequest(BaseModel):
    frameworks: list[str] = Field(min_length=1)
    evidence: list[Evidence]
    period_start: datetime
    period_end: datetime


@app.post("/v1/reports/generate", status_code=202)
async def generate_report(
    body: ReportRequest,
    principal: Annotated[
        Principal, Depends(require_roles("compliance", "auditor", "tenant_admin"))
    ],
):
    canonical = json.dumps(body.model_dump(mode="json"), sort_keys=True, separators=(",", ":"))
    report_id = hashlib.sha256(f"{principal.tenant_id}:{canonical}".encode()).hexdigest()[:24]
    return {
        "report_id": report_id,
        "tenant_id": principal.tenant_id,
        "status": "queued",
        "generated_at": datetime.now(UTC).isoformat(),
        "output": ["signed-pdf", "machine-readable-json", "evidence-manifest"],
    }
