from datetime import UTC, datetime
from enum import StrEnum
from typing import Any
from uuid import UUID, uuid4

from pydantic import BaseModel, Field


class IngestionSource(StrEnum):
    synthea = "synthea"
    fhir = "fhir"
    hl7v2 = "hl7v2"
    dicom = "dicom"
    iomt = "iomt"
    mimic = "mimic"


class DataClassification(StrEnum):
    phi = "PHI"
    deidentified = "DEIDENTIFIED"
    public_deidentified = "PUBLIC_DEIDENTIFIED"
    controlled_research = "CONTROLLED_RESEARCH"
    synthetic = "SYNTHETIC"
    device_telemetry = "DEVICE_TELEMETRY"


class ClinicalEnvelope(BaseModel):
    """Canonical cross-source contract. Payload schemas are versioned independently."""

    event_id: UUID = Field(default_factory=uuid4)
    schema_version: str = "1.0"
    tenant_id: str = Field(pattern=r"^[a-z0-9][a-z0-9-]{2,62}$")
    source: IngestionSource
    source_id: str = Field(min_length=1, max_length=256)
    event_type: str = Field(min_length=1, max_length=128)
    classification: DataClassification
    patient_token: str | None = None
    device_id: str | None = None
    observed_at: datetime
    ingested_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    payload_schema: str
    payload: dict[str, Any]
    provenance: dict[str, str]
    integrity_sha256: str = Field(pattern=r"^[a-f0-9]{64}$")
    trace_id: str = Field(min_length=16, max_length=64)


class IngestionResult(BaseModel):
    accepted: int = 0
    rejected: int = 0
    routed_topics: dict[str, int] = Field(default_factory=dict)
    errors: list[str] = Field(default_factory=list, max_length=20)
