BEGIN;

CREATE TABLE IF NOT EXISTS tenants (
    id text PRIMARY KEY CHECK (id ~ '^[a-z0-9][a-z0-9-]{2,62}$'),
    display_name text NOT NULL,
    status text NOT NULL CHECK (status IN ('active', 'suspended', 'deleting')),
    region text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS compliance_evidence (
    id uuid PRIMARY KEY,
    tenant_id text NOT NULL REFERENCES tenants(id),
    framework text NOT NULL,
    control_id text NOT NULL,
    status text NOT NULL,
    evidence_uri text NOT NULL,
    evidence_sha256 text NOT NULL CHECK (evidence_sha256 ~ '^[a-f0-9]{64}$'),
    observed_at timestamptz NOT NULL,
    UNIQUE (tenant_id, framework, control_id, observed_at)
);

ALTER TABLE compliance_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_evidence FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON compliance_evidence
    USING (tenant_id = current_setting('app.current_tenant', true))
    WITH CHECK (tenant_id = current_setting('app.current_tenant', true));

-- Runtime roles receive table privileges but never BYPASSRLS. Migration ownership uses a separate role.
REVOKE ALL ON tenants, compliance_evidence FROM PUBLIC;
COMMIT;

