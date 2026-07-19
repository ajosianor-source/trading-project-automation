CREATE TABLE IF NOT EXISTS compliance_control_registry (
  tenant_id text NOT NULL,
  framework text NOT NULL CHECK (framework IN (
    'HIPAA','GDPR','NHS_DSPT','ISO27001','SOC2','FDA_21_CFR_11','ISO13485','ISO14971'
  )),
  control_id text NOT NULL,
  title text NOT NULL,
  owner_role text NOT NULL,
  evidence_source text NOT NULL,
  collection_frequency interval NOT NULL,
  retention_period interval NOT NULL,
  remediation_sla interval NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  PRIMARY KEY (tenant_id, framework, control_id)
);

ALTER TABLE compliance_evidence DROP CONSTRAINT IF EXISTS compliance_evidence_framework_check;
ALTER TABLE compliance_evidence ADD CONSTRAINT compliance_evidence_framework_check
  CHECK (framework IN (
    'HIPAA','GDPR','NHS_DSPT','ISO27001','SOC2','FDA_21_CFR_11','ISO13485','ISO14971'
  ));

CREATE TABLE IF NOT EXISTS governance_approvals (
  approval_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text NOT NULL,
  release_sha char(40) NOT NULL,
  approval_type text NOT NULL CHECK (approval_type IN (
    'DPIA','LAWFUL_BASIS','DPA','CLINICAL_SAFETY','SECURITY','PRIVACY',
    'DATA_OWNER','MODEL_BOARD','DATASET_BOARD','RESIDUAL_RISK','OPERATIONS'
  )),
  status text NOT NULL CHECK (status IN ('pending','approved','rejected','expired')),
  approver_subject text,
  evidence_uri text,
  evidence_sha256 char(64),
  approved_at timestamptz,
  expires_at timestamptz,
  UNIQUE (tenant_id, release_sha, approval_type)
);

CREATE TABLE IF NOT EXISTS governed_data_assets (
  asset_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text NOT NULL,
  name text NOT NULL,
  classification text NOT NULL,
  lawful_basis text,
  approved_purposes text[] NOT NULL DEFAULT '{}',
  data_owner text NOT NULL,
  information_asset_owner text NOT NULL,
  retention_days integer NOT NULL CHECK (retention_days > 0),
  deletion_method text NOT NULL,
  source_approval_reference text NOT NULL,
  real_phi boolean NOT NULL DEFAULT false,
  UNIQUE (tenant_id, name)
);

CREATE TABLE IF NOT EXISTS residual_risks (
  risk_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text NOT NULL,
  release_sha char(40) NOT NULL,
  description text NOT NULL,
  likelihood smallint NOT NULL CHECK (likelihood BETWEEN 1 AND 5),
  impact smallint NOT NULL CHECK (impact BETWEEN 1 AND 5),
  treatment text NOT NULL,
  owner_subject text NOT NULL,
  accepted_by text,
  accepted_at timestamptz,
  review_due_at timestamptz NOT NULL
);

DO $$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'compliance_control_registry','governance_approvals','governed_data_assets','residual_risks'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', table_name);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I USING (tenant_id = current_setting(''app.current_tenant'', true)) WITH CHECK (tenant_id = current_setting(''app.current_tenant'', true))',
      table_name
    );
  END LOOP;
END $$;
