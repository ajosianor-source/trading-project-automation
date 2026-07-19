"""Create source-specific clinical projections."""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "0001_data_store"
down_revision = None
branch_labels = None
depends_on = None


def common_columns():
    return [
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("event_id", sa.Uuid(), nullable=False),
        sa.Column("tenant_id", sa.String(63), nullable=False),
        sa.Column("source_id", sa.String(256), nullable=False),
        sa.Column("event_type", sa.String(128), nullable=False),
        sa.Column("classification", sa.String(32), nullable=False),
        sa.Column("patient_token", sa.String(64)),
        sa.Column("device_id", sa.String(256)),
        sa.Column("observed_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "ingested_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column("payload_schema", sa.String(128), nullable=False),
        sa.Column("payload", postgresql.JSONB(none_as_null=True), nullable=False),
        sa.Column("provenance", postgresql.JSONB(none_as_null=True), nullable=False),
        sa.Column("integrity_sha256", sa.String(64), nullable=False),
        sa.Column("trace_id", sa.String(64), nullable=False),
    ]


def create_projection(name: str, extra: list[sa.Column]) -> None:
    op.create_table(
        name,
        *common_columns(),
        *extra,
        sa.PrimaryKeyConstraint("id", name=f"pk_{name}"),
        sa.UniqueConstraint("event_id", name=f"uq_{name}_event_id"),
        sa.UniqueConstraint("tenant_id", "source_id", "integrity_sha256", name=f"uq_{name}_event"),
    )
    op.create_index(f"ix_{name}_tenant_observed", name, ["tenant_id", "observed_at"])
    op.create_index(f"ix_{name}_tenant_patient", name, ["tenant_id", "patient_token"])


def upgrade() -> None:
    create_projection(
        "fhir_records",
        [
            sa.Column("resource_type", sa.String(64), nullable=False),
            sa.Column("resource_version", sa.String(64)),
            sa.Column("display", sa.String(256)),
            sa.Column("birth_year", sa.Integer()),
            sa.Column("gender", sa.String(32)),
        ],
    )
    create_projection(
        "hl7_records",
        [
            sa.Column("message_type", sa.String(32), nullable=False),
            sa.Column("sending_application", sa.String(128)),
            sa.Column("facility", sa.String(128)),
            sa.Column("processing_status", sa.String(16), nullable=False),
        ],
    )
    create_projection(
        "dicom_records",
        [
            sa.Column("study_uid", sa.String(128), nullable=False),
            sa.Column("modality", sa.String(32), nullable=False),
            sa.Column("body_part", sa.String(64)),
            sa.Column("instance_count", sa.Integer(), nullable=False),
            sa.Column("quarantine_status", sa.String(16), nullable=False),
        ],
    )
    create_projection(
        "iomt_records",
        [
            sa.Column("sequence", sa.BigInteger(), nullable=False),
            sa.Column("measurements", postgresql.JSONB(none_as_null=True), nullable=False),
            sa.Column("trust_status", sa.String(16), nullable=False),
        ],
    )
    create_projection(
        "icu_records",
        [
            sa.Column("stay_token", sa.String(64), nullable=False),
            sa.Column("heart_rate", sa.Float()),
            sa.Column("spo2", sa.Float()),
            sa.Column("systolic_bp", sa.Float()),
            sa.Column("respiratory_rate", sa.Float()),
        ],
    )


def downgrade() -> None:
    for table in ("icu_records", "iomt_records", "dicom_records", "hl7_records", "fhir_records"):
        op.drop_table(table)
