BEGIN;

CREATE TABLE IF NOT EXISTS ingestion_checkpoint (
    tenant_id text NOT NULL,
    source text NOT NULL,
    cursor_value text NOT NULL,
    updated_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (tenant_id, source)
);

CREATE TABLE IF NOT EXISTS ingestion_event_ledger (
    event_id uuid PRIMARY KEY,
    tenant_id text NOT NULL,
    source text NOT NULL,
    source_id text NOT NULL,
    integrity_sha256 text NOT NULL,
    status text NOT NULL CHECK (status IN ('accepted', 'routed', 'rejected')),
    topic text,
    ingested_at timestamptz NOT NULL,
    routed_at timestamptz,
    UNIQUE (tenant_id, source, source_id, integrity_sha256)
);

ALTER TABLE ingestion_checkpoint ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingestion_checkpoint FORCE ROW LEVEL SECURITY;
ALTER TABLE ingestion_event_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingestion_event_ledger FORCE ROW LEVEL SECURITY;

CREATE POLICY checkpoint_tenant ON ingestion_checkpoint
    USING (tenant_id = current_setting('app.current_tenant', true))
    WITH CHECK (tenant_id = current_setting('app.current_tenant', true));
CREATE POLICY ledger_tenant ON ingestion_event_ledger
    USING (tenant_id = current_setting('app.current_tenant', true))
    WITH CHECK (tenant_id = current_setting('app.current_tenant', true));

REVOKE ALL ON ingestion_checkpoint, ingestion_event_ledger FROM PUBLIC;
COMMIT;

