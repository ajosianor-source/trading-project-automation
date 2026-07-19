from datetime import UTC, datetime
from enum import StrEnum
from typing import Annotated
from uuid import uuid4

from fastapi import Depends
from healthgov.middleware import secure_app
from healthgov.security import Principal, require_roles
from pydantic import BaseModel, Field

app = secure_app("data-lake-connector")


class Provider(StrEnum):
    s3 = "s3"
    azure_blob = "azure_blob"
    gcs = "gcs"
    delta = "delta"


class ExportJob(BaseModel):
    provider: Provider
    destination: str = Field(pattern=r"^(s3|abfss|gs)://[a-zA-Z0-9._/-]+$")
    dataset: str = Field(pattern=r"^[a-z0-9_]+$")
    format: str = Field(default="parquet", pattern=r"^(parquet|delta)$")
    partition_by: list[str] = Field(default_factory=lambda: ["tenant_id", "event_date"])
    deidentified: bool
    catalog: str | None = None
    retention_days: int = Field(default=2555, ge=1, le=36500)


@app.post("/v1/exports", status_code=202)
async def export(
    body: ExportJob,
    principal: Annotated[
        Principal, Depends(require_roles("data_engineer", "privacy_officer", "tenant_admin"))
    ],
):
    return {
        "job_id": str(uuid4()),
        "tenant_id": principal.tenant_id,
        "status": "policy_check_pending",
        "output": body.destination,
        "encryption": "customer-managed-key",
        "lineage_event": "queued",
        "created_at": datetime.now(UTC).isoformat(),
    }


@app.get("/v1/catalog/datasets")
async def datasets(
    principal: Annotated[
        Principal, Depends(require_roles("data_engineer", "auditor", "privacy_officer"))
    ],
):
    return {"tenant_id": principal.tenant_id, "datasets": [], "lineage_provider": "openlineage"}
