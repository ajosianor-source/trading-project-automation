-- Missing-module persistence. Every table is tenant isolated; application transactions
-- set app.current_tenant from a verified access-token claim.
CREATE TABLE synthetic_datasets (
  dataset_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text NOT NULL,
  dataset_type text NOT NULL CHECK (dataset_type IN ('FHIR','HL7V2','COMPLIANCE','IOMT','MIXED')),
  record_count integer NOT NULL CHECK (record_count >= 0),
  seed_token char(64) NOT NULL,
  schema_version text NOT NULL,
  status text NOT NULL CHECK (status IN ('generated','published','expired')),
  expires_at timestamptz NOT NULL,
  created_by_token char(64) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE compliance_events (
  event_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text NOT NULL,
  framework text NOT NULL CHECK (framework IN ('HIPAA','GDPR','NHS_DSPT','ISO27001','SOC2')),
  control_id text NOT NULL,
  event_type text NOT NULL,
  source text NOT NULL,
  status text NOT NULL CHECK (status IN ('effective','partial','ineffective','not_applicable')),
  artifact_sha256 char(64),
  payload jsonb NOT NULL DEFAULT '{}',
  observed_at timestamptz NOT NULL,
  ingested_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX compliance_events_control_idx
  ON compliance_events (tenant_id, framework, control_id, observed_at DESC);

CREATE TABLE framework_controls (
  tenant_id text NOT NULL,
  framework text NOT NULL CHECK (framework IN ('NHS_DSPT','ISO27001','SOC2')),
  framework_version text NOT NULL,
  control_id text NOT NULL,
  domain text NOT NULL,
  title text NOT NULL,
  weight numeric(6,3) NOT NULL DEFAULT 1,
  mandatory boolean NOT NULL DEFAULT true,
  evidence_requirements jsonb NOT NULL DEFAULT '[]',
  owner_role text NOT NULL,
  PRIMARY KEY (tenant_id, framework, control_id)
);

CREATE TABLE compliance_drift (
  drift_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text NOT NULL,
  framework text NOT NULL,
  control_id text NOT NULL,
  expected_state text NOT NULL,
  actual_state text,
  severity text NOT NULL CHECK (severity IN ('critical','high','medium','low')),
  detected_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

CREATE TABLE iomt_devices (
  device_id text NOT NULL,
  tenant_id text NOT NULL,
  device_type text NOT NULL CHECK (device_type IN ('heart_monitor','ventilator','wearable','imaging')),
  manufacturer text NOT NULL,
  model text NOT NULL,
  site text NOT NULL,
  identity_thumbprint char(64) NOT NULL,
  firmware_version text NOT NULL,
  trust_state text NOT NULL CHECK (trust_state IN ('trusted','review','quarantined','revoked')),
  risk_score numeric(5,2) NOT NULL DEFAULT 0,
  last_seen_at timestamptz,
  enrolled_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, device_id),
  UNIQUE (tenant_id, identity_thumbprint)
);

CREATE TABLE iomt_firmware (
  firmware_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text NOT NULL,
  device_id text NOT NULL,
  version text NOT NULL,
  sha256 char(64) NOT NULL,
  signature_verified boolean NOT NULL,
  sbom_sha256 char(64),
  critical_findings integer NOT NULL DEFAULT 0,
  high_findings integer NOT NULL DEFAULT 0,
  scan_status text NOT NULL CHECK (scan_status IN ('pending','passed','failed','quarantined')),
  scanned_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, device_id, sha256),
  FOREIGN KEY (tenant_id, device_id) REFERENCES iomt_devices (tenant_id, device_id)
);

CREATE TABLE iomt_telemetry (
  telemetry_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text NOT NULL,
  device_id text NOT NULL,
  sequence bigint NOT NULL,
  observed_at timestamptz NOT NULL,
  normalized_metrics jsonb NOT NULL,
  anomaly_score numeric(6,5) NOT NULL DEFAULT 0,
  anomaly_reasons jsonb NOT NULL DEFAULT '[]',
  integrity_sha256 char(64) NOT NULL,
  UNIQUE (tenant_id, device_id, sequence),
  FOREIGN KEY (tenant_id, device_id) REFERENCES iomt_devices (tenant_id, device_id)
);
CREATE INDEX iomt_telemetry_recent_idx ON iomt_telemetry (tenant_id, device_id, observed_at DESC);

DO $$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'synthetic_datasets','compliance_events','framework_controls','compliance_drift',
    'iomt_devices','iomt_firmware','iomt_telemetry'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', table_name);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I USING (tenant_id=current_setting(''app.current_tenant'',true)) WITH CHECK (tenant_id=current_setting(''app.current_tenant'',true))',
      table_name
    );
  END LOOP;
END $$;
