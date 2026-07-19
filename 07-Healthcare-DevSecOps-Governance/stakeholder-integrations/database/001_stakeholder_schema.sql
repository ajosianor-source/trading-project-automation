CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE compliance_evidence (
  evidence_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text NOT NULL,
  framework text NOT NULL CHECK (framework IN ('HIPAA','GDPR','NHS_DSPT','ISO27001','SOC2')),
  control_id text NOT NULL,
  status text NOT NULL CHECK (status IN ('effective','partial','ineffective','not_applicable')),
  artifact_uri text NOT NULL,
  artifact_sha256 char(64) NOT NULL,
  collector text NOT NULL,
  observed_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL,
  UNIQUE (tenant_id, framework, control_id, artifact_sha256)
);
CREATE INDEX compliance_evidence_posture_idx ON compliance_evidence (tenant_id, framework, status, observed_at DESC);

CREATE TABLE risk_scores (
  risk_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text NOT NULL,
  asset_token text NOT NULL,
  domain text NOT NULL CHECK (domain IN ('phi','iomt','fhir','ai_ml','compliance','enterprise')),
  likelihood smallint NOT NULL CHECK (likelihood BETWEEN 1 AND 5),
  impact smallint NOT NULL CHECK (impact BETWEEN 1 AND 5),
  inherent_score numeric(5,2) NOT NULL,
  residual_score numeric(5,2) NOT NULL,
  treatment_status text NOT NULL,
  accepted_by text,
  calculated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX risk_scores_heatmap_idx ON risk_scores (tenant_id, calculated_at DESC, likelihood, impact);

CREATE TABLE alerts (
  alert_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text NOT NULL,
  deduplication_key text NOT NULL,
  source text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('critical','high','medium','low')),
  status text NOT NULL CHECK (status IN ('open','acknowledged','contained','resolved','false_positive')),
  title text NOT NULL,
  asset_token text,
  ticket_provider text,
  ticket_reference text,
  playbook text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX alerts_open_dedupe_idx ON alerts (tenant_id, deduplication_key) WHERE status IN ('open','acknowledged','contained');

CREATE TABLE audit_log (
  audit_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tenant_id text NOT NULL,
  occurred_at timestamptz NOT NULL,
  actor_token text NOT NULL,
  event_domain text NOT NULL,
  action text NOT NULL,
  resource_token text NOT NULL,
  purpose_of_use text NOT NULL,
  outcome text NOT NULL,
  trace_id text NOT NULL,
  previous_digest char(64),
  event_digest char(64) NOT NULL,
  retention_class text NOT NULL,
  UNIQUE (tenant_id, event_digest)
);
CREATE INDEX audit_log_trace_idx ON audit_log (tenant_id, trace_id, occurred_at);

CREATE TABLE role_assignments (
  assignment_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text NOT NULL,
  subject_id text NOT NULL,
  role_id text NOT NULL,
  scope text NOT NULL,
  scope_id text,
  granted_by text NOT NULL,
  granted_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  UNIQUE (tenant_id, subject_id, role_id, scope, scope_id)
);

CREATE TABLE plugin_registry (
  plugin_id text NOT NULL,
  version text NOT NULL,
  tenant_id text NOT NULL,
  image_digest text NOT NULL,
  signature_bundle_uri text NOT NULL,
  permissions jsonb NOT NULL DEFAULT '[]',
  processes_phi boolean NOT NULL DEFAULT false,
  approval_status text NOT NULL,
  approved_by text,
  installed_at timestamptz,
  PRIMARY KEY (tenant_id, plugin_id, version)
);

CREATE TABLE ai_model_metadata (
  model_id text NOT NULL,
  version text NOT NULL,
  tenant_id text NOT NULL,
  artifact_sha256 char(64) NOT NULL,
  dataset_version text NOT NULL,
  intended_use text NOT NULL,
  risk_class text NOT NULL,
  drift_score numeric(8,6),
  adversarial_status text,
  signed boolean NOT NULL,
  sbom_uri text,
  approved_at timestamptz,
  retired_at timestamptz,
  PRIMARY KEY (tenant_id, model_id, version)
);

-- Application transactions must SET LOCAL app.current_tenant from a verified JWT claim.
DO $$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'compliance_evidence','risk_scores','alerts','audit_log',
    'role_assignments','plugin_registry','ai_model_metadata'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I USING (tenant_id = current_setting(''app.current_tenant'', true)) WITH CHECK (tenant_id = current_setting(''app.current_tenant'', true))',
      table_name
    );
  END LOOP;
END $$;

CREATE FUNCTION reject_audit_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'audit_log is append-only';
END $$;
CREATE TRIGGER audit_log_immutable
  BEFORE UPDATE OR DELETE ON audit_log
  FOR EACH ROW EXECUTE FUNCTION reject_audit_mutation();
