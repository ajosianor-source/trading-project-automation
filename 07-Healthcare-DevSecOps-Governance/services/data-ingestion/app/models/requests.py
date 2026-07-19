from typing import Any

from pydantic import BaseModel, Field, HttpUrl


class FhirIngestRequest(BaseModel):
    tenant_id: str
    bundle: dict[str, Any] | None = None
    source_url: HttpUrl | None = None
    resource_type: str | None = None


class Hl7IngestRequest(BaseModel):
    tenant_id: str
    message: str = Field(min_length=8, max_length=1_000_000)


class IomtTelemetryRequest(BaseModel):
    tenant_id: str
    device_id: str = Field(pattern=r"^[a-zA-Z0-9:_-]{8,128}$")
    sequence: int = Field(ge=0)
    observed_at: str
    measurements: dict[str, float | int | str]
    signature: str = Field(min_length=16)


class MimicIngestRequest(BaseModel):
    tenant_id: str
    dataset_path: str | None = None
    tables: list[str] = Field(default=["patients", "admissions", "chartevents"], max_length=20)
    limit: int | None = Field(default=None, ge=1, le=1_000_000)


class OrchestratorRequest(BaseModel):
    tenant_id: str
    pipelines: list[str] = Field(
        default=["synthea", "fhir", "iomt"],
        min_length=1,
        max_length=6,
    )
