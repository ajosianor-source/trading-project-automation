from datetime import datetime, timedelta
from uuid import UUID, uuid4

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    Integer,
    Interval,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import Mapped, mapped_column

from database import Base


class Tenant(Base):
    __tablename__ = "tenants"

    id: Mapped[str] = mapped_column(
        String(63),
        primary_key=True,
        info={"check": "id ~ '^[a-z0-9][a-z0-9-]{2,62}$'"},
    )
    display_name: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
        default="active",
    )
    region: Mapped[str] = mapped_column(String(64), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=datetime.utcnow,
    )

    __table_args__ = (
        CheckConstraint("status IN ('active', 'suspended', 'deleting')", name="ck_tenants_status"),
        CheckConstraint("id ~ '^[a-z0-9][a-z0-9-]{2,62}$'", name="ck_tenants_id_format"),
    )


class ComplianceEvidence(Base):
    __tablename__ = "compliance_evidence"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    tenant_id: Mapped[str] = mapped_column(String(63), nullable=False)
    framework: Mapped[str] = mapped_column(String(64), nullable=False)
    control_id: Mapped[str] = mapped_column(String(128), nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False)
    evidence_uri: Mapped[str] = mapped_column(Text, nullable=False)
    evidence_sha256: Mapped[str] = mapped_column(String(64), nullable=False)
    observed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    __table_args__ = (
        UniqueConstraint("tenant_id", "framework", "control_id", "observed_at", name="uq_compliance_evidence_observed"),
        CheckConstraint("evidence_sha256 ~ '^[a-f0-9]{64}$'", name="ck_compliance_evidence_sha256"),
        CheckConstraint(
            "framework IN ('HIPAA','GDPR','NHS_DSPT','ISO27001','SOC2','FDA_21_CFR_11','ISO13485','ISO14971')",
            name="compliance_evidence_framework_check"
        ),
    )



class ComplianceControlRegistry(Base):
    __tablename__ = "compliance_control_registry"

    tenant_id: Mapped[str] = mapped_column(String(63), primary_key=True)
    framework: Mapped[str] = mapped_column(String(64), primary_key=True)
    control_id: Mapped[str] = mapped_column(String(128), primary_key=True)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    owner_role: Mapped[str] = mapped_column(String(64), nullable=False)
    evidence_source: Mapped[str] = mapped_column(String(256), nullable=False)
    collection_frequency: Mapped[timedelta] = mapped_column(Interval, nullable=False)
    retention_period: Mapped[timedelta] = mapped_column(Interval, nullable=False)
    reremediation_sla: Mapped[timedelta] = mapped_column(Interval, nullable=False)
    enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    __table_args__ = (
        CheckConstraint(
            "framework IN ('HIPAA','GDPR','NHS_DSPT','ISO27001','SOC2','FDA_21_CFR_11','ISO13485','ISO14971')",
            name="ck_compliance_control_registry_framework"
        ),
    )


class GovernanceApproval(Base):
    __tablename__ = "governance_approvals"

    approval_id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    tenant_id: Mapped[str] = mapped_column(String(63), nullable=False)
    release_sha: Mapped[str] = mapped_column(String(40), nullable=False)
    approval_type: Mapped[str] = mapped_column(String(64), nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False)
    approver_subject: Mapped[str | None] = mapped_column(String(256))
    evidence_uri: Mapped[str | None] = mapped_column(Text)
    evidence_sha256: Mapped[str | None] = mapped_column(String(64))
    approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    __table_args__ = (
        UniqueConstraint("tenant_id", "release_sha", "approval_type", name="uq_governance_approvals_type"),
        CheckConstraint(
            "approval_type IN ('DPIA','LAWFUL_BASIS','DPA','CLINICAL_SAFETY','SECURITY','PRIVACY','DATA_OWNER','MODEL_BOARD','DATASET_BOARD','RESIDUAL_RISK','OPERATIONS')",
            name="ck_governance_approvals_type"
        ),
        CheckConstraint("status IN ('pending','approved','rejected','expired')", name="ck_governance_approvals_status"),
    )


class GovernedDataAsset(Base):
    __tablename__ = "governed_data_assets"

    asset_id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    tenant_id: Mapped[str] = mapped_column(String(63), nullable=False)
    name: Mapped[str] = mapped_column(String(256), nullable=False)
    classification: Mapped[str] = mapped_column(String(64), nullable=False)
    lawful_basis: Mapped[str | None] = mapped_column(String(256))
    approved_purposes: Mapped[list[str]] = mapped_column(ARRAY(String(128)), nullable=False, default=list)
    data_owner: Mapped[str] = mapped_column(String(256), nullable=False)
    information_asset_owner: Mapped[str] = mapped_column(String(256), nullable=False)
    retention_days: Mapped[int] = mapped_column(Integer, nullable=False)
    deletion_method: Mapped[str] = mapped_column(String(128), nullable=False)
    source_approval_reference: Mapped[str] = mapped_column(String(256), nullable=False)
    real_phi: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    __table_args__ = (
        UniqueConstraint("tenant_id", "name", name="uq_governed_data_assets_name"),
        CheckConstraint("retention_days > 0", name="ck_governed_data_assets_retention"),
    )


class ResidualRisk(Base):
    __tablename__ = "residual_risks"

    risk_id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    tenant_id: Mapped[str] = mapped_column(String(63), nullable=False)
    release_sha: Mapped[str] = mapped_column(String(40), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    likelihood: Mapped[int] = mapped_column(Integer, nullable=False)
    impact: Mapped[int] = mapped_column(Integer, nullable=False)
    treatment: Mapped[str] = mapped_column(Text, nullable=False)
    owner_subject: Mapped[str] = mapped_column(String(256), nullable=False)
    accepted_by: Mapped[str | None] = mapped_column(String(256))
    accepted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    review_due_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=False)

    __table_args__ = (
        CheckConstraint("likelihood BETWEEN 1 AND 5", name="ck_residual_risks_likelihood"),
        CheckConstraint("impact BETWEEN 1 AND 5", name="ck_residual_risks_impact"),
    )



class DatasetRegistry(Base):
    __tablename__ = "dataset_registry"

    dataset_id: Mapped[str] = mapped_column(String(64), primary_key=True)
    dataset_name: Mapped[str] = mapped_column(String(256), nullable=False)
    dataset_type: Mapped[str] = mapped_column(String(64), nullable=False) # synthetic, de-identified, restricted
    license_required: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    license_status: Mapped[str] = mapped_column(String(64), nullable=False, default="pending") # pending, accepted
    doi: Mapped[str | None] = mapped_column(String(128))
    ingestion_mode: Mapped[str] = mapped_column(String(64), nullable=False, default="manual") # scheduled, streaming, manual
    governance_gate: Mapped[str] = mapped_column(String(64), nullable=False, default="blocked") # open, blocked
    last_ingested_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    next_ingestion_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    __table_args__ = (
        CheckConstraint("dataset_type IN ('synthetic', 'de-identified', 'restricted')", name="ck_dataset_registry_type"),
        CheckConstraint("license_status IN ('pending', 'accepted')", name="ck_dataset_registry_license_status"),
        CheckConstraint("ingestion_mode IN ('scheduled', 'streaming', 'manual')", name="ck_dataset_registry_mode"),
        CheckConstraint("governance_gate IN ('open', 'blocked')", name="ck_dataset_registry_gate"),
    )
