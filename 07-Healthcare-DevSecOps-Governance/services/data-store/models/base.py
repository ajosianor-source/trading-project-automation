from datetime import datetime
from typing import Any
from uuid import UUID, uuid4

from sqlalchemy import DateTime, Index, String, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, declared_attr, mapped_column
from sqlalchemy.types import JSON

JSON_TYPE = JSON().with_variant(JSONB(none_as_null=True), "postgresql")


class ClinicalRecordMixin:
    """Columns shared by every source projection.

    Source-specific tables keep query plans small while these fields preserve a single
    normalized contract for auditing, retention, and cross-source analytics.
    """

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    event_id: Mapped[UUID] = mapped_column(unique=True, default=uuid4)
    tenant_id: Mapped[str] = mapped_column(String(63), nullable=False)
    source_id: Mapped[str] = mapped_column(String(256), nullable=False)
    event_type: Mapped[str] = mapped_column(String(128), nullable=False)
    classification: Mapped[str] = mapped_column(String(32), nullable=False)
    patient_token: Mapped[str | None] = mapped_column(String(64))
    device_id: Mapped[str | None] = mapped_column(String(256))
    observed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    ingested_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    payload_schema: Mapped[str] = mapped_column(String(128), nullable=False)
    payload: Mapped[dict[str, Any]] = mapped_column(JSON_TYPE, nullable=False, default=dict)
    payload_ciphertext: Mapped[str | None] = mapped_column(Text)
    key_version: Mapped[str | None] = mapped_column(String(64))
    provenance: Mapped[dict[str, Any]] = mapped_column(JSON_TYPE, nullable=False, default=dict)
    integrity_sha256: Mapped[str] = mapped_column(String(64), nullable=False)
    trace_id: Mapped[str] = mapped_column(String(64), nullable=False)

    @declared_attr.directive
    def __table_args__(cls):
        return (
            UniqueConstraint(
                "tenant_id", "source_id", "integrity_sha256", name=f"uq_{cls.__tablename__}_event"
            ),
            Index(f"ix_{cls.__tablename__}_tenant_observed", "tenant_id", "observed_at"),
            Index(f"ix_{cls.__tablename__}_tenant_patient", "tenant_id", "patient_token"),
        )
