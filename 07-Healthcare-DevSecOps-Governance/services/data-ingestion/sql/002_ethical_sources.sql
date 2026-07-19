BEGIN;

CREATE TABLE IF NOT EXISTS ethical_data_source (
    source_id text PRIMARY KEY,
    name text NOT NULL,
    access_tier text NOT NULL CHECK (
        access_tier IN ('SYNTHETIC', 'PUBLIC_DEIDENTIFIED', 'CONTROLLED_RESEARCH', 'LIVE_PHI')
    ),
    license_id text NOT NULL,
    homepage text NOT NULL,
    enabled boolean NOT NULL DEFAULT false,
    approval_reference text,
    attribution_reference text,
    approved_purpose text,
    reviewed_at timestamptz,
    reviewed_by text
);

CREATE TABLE IF NOT EXISTS dataset_ingestion_run (
    run_id uuid PRIMARY KEY,
    tenant_id text NOT NULL,
    source_id text NOT NULL REFERENCES ethical_data_source(source_id),
    classification text NOT NULL,
    license_id text NOT NULL,
    approval_reference text,
    started_at timestamptz NOT NULL DEFAULT now(),
    completed_at timestamptz,
    accepted_count bigint NOT NULL DEFAULT 0,
    rejected_count bigint NOT NULL DEFAULT 0,
    status text NOT NULL CHECK (status IN ('started', 'completed', 'failed', 'blocked'))
);

ALTER TABLE dataset_ingestion_run ENABLE ROW LEVEL SECURITY;
ALTER TABLE dataset_ingestion_run FORCE ROW LEVEL SECURITY;
CREATE POLICY dataset_run_tenant ON dataset_ingestion_run
    USING (tenant_id = current_setting('app.current_tenant', true))
    WITH CHECK (tenant_id = current_setting('app.current_tenant', true));

INSERT INTO ethical_data_source
    (source_id, name, access_tier, license_id, homepage, enabled)
VALUES
    ('synthea', 'Synthea synthetic patients', 'SYNTHETIC', 'Apache-2.0',
     'https://github.com/synthetichealth/synthea', true),
    ('private-hapi', 'Private HAPI FHIR', 'SYNTHETIC', 'Apache-2.0',
     'https://github.com/hapifhir/hapi-fhir-jpaserver-starter', true),
    ('tcia', 'TCIA TCGA-LUAD Version 4', 'PUBLIC_DEIDENTIFIED', 'TCIA_DATA_USAGE_POLICY',
     'https://www.cancerimagingarchive.net/collection/tcga-luad/', true),
    ('physionet-bidmc', 'BIDMC PPG and Respiration Dataset', 'PUBLIC_DEIDENTIFIED',
     'ODC-By-1.0', 'https://physionet.org/content/bidmc/1.0.0/', true),
    ('mimic-iv', 'MIMIC-IV', 'CONTROLLED_RESEARCH',
     'PHYSIONET_CREDENTIALLED_HEALTH_DATA_DUA',
     'https://physionet.org/content/mimiciv/', false)
ON CONFLICT (source_id) DO NOTHING;

REVOKE ALL ON ethical_data_source, dataset_ingestion_run FROM PUBLIC;
COMMIT;
