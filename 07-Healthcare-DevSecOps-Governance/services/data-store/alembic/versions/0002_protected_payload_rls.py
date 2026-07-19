"""Encrypt source payloads and enforce tenant row-level security."""

import sqlalchemy as sa
from alembic import op

revision = "0002_protected_rls"
down_revision = "0001_data_store"
branch_labels = None
depends_on = None

TABLES = ("fhir_records", "hl7_records", "dicom_records", "iomt_records", "icu_records")


def upgrade() -> None:
    for table in TABLES:
        op.add_column(table, sa.Column("payload_ciphertext", sa.Text(), nullable=True))
        op.add_column(table, sa.Column("key_version", sa.String(64), nullable=True))
        op.execute(f'ALTER TABLE "{table}" ENABLE ROW LEVEL SECURITY')
        op.execute(f'ALTER TABLE "{table}" FORCE ROW LEVEL SECURITY')
        op.execute(
            f"""CREATE POLICY tenant_isolation ON "{table}"
            USING (tenant_id = current_setting('app.current_tenant', true))
            WITH CHECK (tenant_id = current_setting('app.current_tenant', true))"""
        )


def downgrade() -> None:
    for table in reversed(TABLES):
        op.execute(f'DROP POLICY IF EXISTS tenant_isolation ON "{table}"')
        op.drop_column(table, "key_version")
        op.drop_column(table, "payload_ciphertext")
