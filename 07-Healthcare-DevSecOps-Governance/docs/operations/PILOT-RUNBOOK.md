# Controlled pilot runbook

## Provision

1. Bootstrap the encrypted/locked Terraform backend with the dedicated bootstrap role.
2. Apply `infra/terraform/environments/dev` using the OIDC-federated staging CI role.
3. Install External Secrets Operator and render `infra/kubernetes/overlays/staging`.
4. Populate secret values and rotation configuration outside Terraform.
5. Configure Entra Conditional Access for phishing-resistant authentication and PIM.
6. Apply migrations through `database/migrations/004_pilot_governance.sql`.

## Governed data load

1. Review and sign `ops/staging/approved-sources.json`.
2. Generate approved Synthea FHIR bundles into the mounted Synthea directory.
3. Run `download_bidmc.py --accept-license`; archive its source receipt and upstream checksums.
4. Obtain TCGA-LUAD through the approved TCIA/NBIA workflow. Store collection DOI,
   data-usage policy and attribution receipt beside the quarantined DICOM files.
5. Run `load_approved_sources.py` first without `--execute`, review the plan, then execute
   with a Vault-issued short-lived ingestion token.
6. Confirm Kafka offsets advance, ledger rows reach `routed`, HAPI `/metadata` is healthy,
   and every portal widget reads a live BFF API. Empty data must display as empty—not fabricated.

MIMIC-IV is not downloaded, mounted or enabled. Enabling it requires a separate approved change
containing credentialing, training, DUA, DPIA, data-owner and environment-scope evidence.

## Security and release evidence

1. Run the `Controlled production pilot security` workflow.
2. Restore the latest backup into an isolated account/database using `verify_restore.ps1`.
3. Complete an independent penetration test and remediate all critical/high findings.
4. Run compliance collection for a complete frequency window and resolve stale evidence.
5. Assemble the signed pilot evidence manifest and obtain security, privacy, clinical safety
   and operations approvals through the protected `production-governance` environment.
6. Deploy only a full signed commit SHA. Monitor the limited cohort and keep rollback ready.

## Exit criteria

- Zero real PHI.
- All security tests, OPA policies, DAST, penetration test and restore tests pass.
- No critical/high vulnerability remains.
- Evidence is current and immutable.
- RTO/RPO are demonstrated.
- Named accountable owners sign the release and residual risks.
