from datetime import UTC, datetime
from typing import Any, Literal
from uuid import UUID, uuid4

from pydantic import BaseModel, ConfigDict, Field


class StoreEnvelope(BaseModel):
    """Canonical input accepted from the ingestion router.

    Defaults allow controlled backfills, but tenant identity is always supplied by the
    authenticated principal rather than trusted from the request body.
    """

    model_config = ConfigDict(extra="forbid")

    event_id: UUID = Field(default_factory=uuid4)
    schema_version: str = "1.0"
    source_id: str | None = Field(default=None, max_length=256)
    event_type: str | None = Field(default=None, max_length=128)
    classification: str | None = Field(default=None, max_length=32)
    patient_token: str | None = Field(default=None, max_length=64)
    device_id: str | None = Field(default=None, max_length=256)
    observed_at: datetime | None = None
    ingested_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    payload_schema: str | None = Field(default=None, max_length=128)
    payload: dict[str, Any] = Field(default_factory=dict)
    provenance: dict[str, Any] = Field(default_factory=dict)
    integrity_sha256: str | None = Field(default=None, pattern=r"^[a-f0-9]{64}$")
    trace_id: str | None = Field(default=None, min_length=16, max_length=64)


class StoreResult(BaseModel):
    event_id: UUID
    stored: bool
    duplicate: bool


class TrendPoint(BaseModel):
    time: str
    accepted: int
    rejected: int = 0


class SourceSummary(BaseModel):
    accepted24h: int
    rejected24h: int
    eventsPerMinute: float
    lastEventAt: datetime | None
    status: Literal["healthy", "degraded", "offline"]
    trend: list[TrendPoint]


class Page(BaseModel):
    items: list[Any]
    nextCursor: str | None = None
    total: int
