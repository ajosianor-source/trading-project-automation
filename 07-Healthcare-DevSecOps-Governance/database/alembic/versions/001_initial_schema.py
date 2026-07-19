"""initial_schema

Revision ID: 001_initial_schema
Revises: 
Create Date: 2026-07-18 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "001_initial_schema"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def enable_rls(table_name: str):
    op.execute(sa.text(f"ALTER TABLE {table_name} ENABLE ROW LEVEL SECURITY"))
    op.execute(sa.text(f"ALTER TABLE {table_name} FORCE ROW LEVEL SECURITY"))


def create_tenant_policy(table_name: str):
    op.execute(
        sa.text(
            f"CREATE POLICY tenant_isolation ON {table_name} "
            f"USING (tenant_id = current_setting('app.current_tenant', true)) "
            f"WITH CHECK (tenant_id = current_setting('app.current_tenant', true))"
        )
    )


def upgrade() -> None:
    # 1. Create tenants table
    op.create_table(
        "tenants",
        sa.Column("id", sa.String(length=63), primary_key=True),
        sa.Column("display_name", sa.Text(), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="active"),
        sa.Column("region", sa.String(length=64), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.CheckConstraint("status IN ('active', 'suspended', 'deleting')", name="ck_tenants_status"),
        sa.CheckConstraint("id ~ '^[a-z0-9][a-z0-9-]{2,62}$'", name="ck_tenants_id_format"),
    )

    # 2. Create compliance_evidence table
    op.create_table(
        "compliance_evidence",
        sa.Column("id", sa.UUID(), primary_key=True),
        sa.Column("tenant_id", sa.String(length=63), nullable=False),
        sa.Column("framework", sa.String(length=64), nullable=False),
        sa.Column("control_id", sa.String(length=128), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("evidence_uri", sa.Text(), nullable=False),
        sa.Column("evidence_sha256", sa.String(length=64), nullable=False),
        sa.Column("observed_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"], name="fk_compliance_evidence_tenant_id_tenants"),
        sa.UniqueConstraint("tenant_id", "framework", "control_id", "observed_at", name="uq_compliance_evidence_observed"),
        sa.CheckConstraint("evidence_sha256 ~ '^[a-f0-9]{64}$'", name="ck_compliance_evidence_sha256"),
        sa.CheckConstraint(
            "framework IN ('HIPAA','GDPR','NHS_DSPT','ISO27001','SOC2','FDA_21_CFR_11','ISO13485','ISO14971')",
            name="compliance_evidence_framework_check"
        ),
    )

    # 3. Create compliance_control_registry table
    op.create_table(
        "compliance_control_registry",
        sa.Column("tenant_id", sa.String(length=63), primary_key=True),
        sa.Column("framework", sa.String(length=64), primary_key=True),
        sa.Column("control_id", sa.String(length=128), primary_key=True),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("owner_role", sa.String(length=64), nullable=False),
        sa.Column("evidence_source", sa.String(length=256), nullable=False),
        sa.Column("collection_frequency", sa.Interval(), nullable=False),
        sa.Column("retention_period", sa.Interval(), nullable=False),
        sa.Column("reremediation_sla", sa.Interval(), nullable=False),
        sa.Column("enabled", sa.Boolean(), nullable=False, server_default="true"),
        sa.CheckConstraint(
            "framework IN ('HIPAA','GDPR','NHS_DSPT','ISO27001','SOC2','FDA_21_CFR_11','ISO13485','ISO14971')",
            name="ck_compliance_control_registry_framework"
        ),
    )


    # 4. Create governance_approvals table
    op.create_table(
        "governance_approvals",
        sa.Column("approval_id", sa.UUID(), primary_key=True),
        sa.Column("tenant_id", sa.String(length=63), nullable=False),
        sa.Column("release_sha", sa.String(length=40), nullable=False),
        sa.Column("approval_type", sa.String(length=64), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("approver_subject", sa.String(length=256), nullable=True),
        sa.Column("evidence_uri", sa.Text(), nullable=True),
        sa.Column("evidence_sha256", sa.String(length=64), nullable=True),
        sa.Column("approved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.UniqueConstraint("tenant_id", "release_sha", "approval_type", name="uq_governance_approvals_type"),
        sa.CheckConstraint(
            "approval_type IN ('DPIA','LAWFUL_BASIS','DPA','CLINICAL_SAFETY','SECURITY','PRIVACY','DATA_OWNER','MODEL_BOARD','DATASET_BOARD','RESIDUAL_RISK','OPERATIONS')",
            name="ck_governance_approvals_type"
        ),
        sa.CheckConstraint("status IN ('pending','approved','rejected','expired')", name="ck_governance_approvals_status"),
    )

    # 5. Create governed_data_assets table
    op.create_table(
        "governed_data_assets",
        sa.Column("asset_id", sa.UUID(), primary_key=True),
        sa.Column("tenant_id", sa.String(length=63), nullable=False),
        sa.Column("name", sa.String(length=256), nullable=False),
        sa.Column("classification", sa.String(length=64), nullable=False),
        sa.Column("lawful_basis", sa.String(length=256), nullable=True),
        sa.Column("approved_purposes", postgresql.ARRAY(sa.String(length=128)), nullable=False, server_default="{}"),
        sa.Column("data_owner", sa.String(length=256), nullable=False),
        sa.Column("information_asset_owner", sa.String(length=256), nullable=False),
        sa.Column("retention_days", sa.Integer(), nullable=False),
        sa.Column("deletion_method", sa.String(length=128), nullable=False),
        sa.Column("source_approval_reference", sa.String(length=256), nullable=False),
        sa.Column("real_phi", sa.Boolean(), nullable=False, server_default="false"),
        sa.UniqueConstraint("tenant_id", "name", name="uq_governed_data_assets_name"),
        sa.CheckConstraint("retention_days > 0", name="ck_governed_data_assets_retention"),
    )

    # 6. Create residual_risks table
    op.create_table(
        "residual_risks",
        sa.Column("risk_id", sa.UUID(), primary_key=True),
        sa.Column("tenant_id", sa.String(length=63), nullable=False),
        sa.Column("release_sha", sa.String(length=40), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("likelihood", sa.Integer(), nullable=False),
        sa.Column("impact", sa.Integer(), nullable=False),
        sa.Column("treatment", sa.Text(), nullable=False),
        sa.Column("owner_subject", sa.String(length=256), nullable=False),
        sa.Column("accepted_by", sa.String(length=256), nullable=True),
        sa.Column("accepted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("review_due_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint("likelihood BETWEEN 1 AND 5", name="ck_residual_risks_likelihood"),
        sa.CheckConstraint("impact BETWEEN 1 AND 5", name="ck_residual_risks_impact"),
    )

    # 6b. Create dataset_registry table
    op.create_table(
        "dataset_registry",
        sa.Column("dataset_id", sa.String(length=64), primary_key=True),
        sa.Column("dataset_name", sa.String(length=256), nullable=False),
        sa.Column("dataset_type", sa.String(length=64), nullable=False),
        sa.Column("license_required", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("license_status", sa.String(length=64), nullable=False, server_default="pending"),
        sa.Column("doi", sa.String(length=128), nullable=True),
        sa.Column("ingestion_mode", sa.String(length=64), nullable=False, server_default="manual"),
        sa.Column("governance_gate", sa.String(length=64), nullable=False, server_default="blocked"),
        sa.Column("last_ingested_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("next_ingestion_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint("dataset_type IN ('synthetic', 'de-identified', 'restricted')", name="ck_dataset_registry_type"),
        sa.CheckConstraint("license_status IN ('pending', 'accepted')", name="ck_dataset_registry_license_status"),
        sa.CheckConstraint("ingestion_mode IN ('scheduled', 'streaming', 'manual')", name="ck_dataset_registry_mode"),
        sa.CheckConstraint("governance_gate IN ('open', 'blocked')", name="ck_dataset_registry_gate"),
    )

    # 7. Enable Row-Level Security (RLS) and create policies
    tables_with_rls = [
        "compliance_evidence",
        "compliance_control_registry",
        "governance_approvals",
        "governed_data_assets",
        "residual_risks",
    ]
    for table in tables_with_rls:
        enable_rls(table)
        create_tenant_policy(table)

    # 8. Revoke public access
    for table in ["tenants", "dataset_registry"] + tables_with_rls:
        op.execute(sa.text(f"REVOKE ALL ON {table} FROM PUBLIC"))


def downgrade() -> None:
    tables = [
        "dataset_registry",
        "residual_risks",
        "governed_data_assets",
        "governance_approvals",
        "compliance_control_registry",
        "compliance_evidence",
        "tenants",
    ]
    for table in tables:
        op.drop_table(table)
