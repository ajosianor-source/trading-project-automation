# Security assurance plan

## Assurance layers

1. **Prevent:** phishing-resistant OIDC, short-lived tokens, purpose-of-use authorization,
   tenant RLS, mTLS/TLS 1.3, default-deny networking, workload identity, least privilege,
   encrypted storage, approved-source policy, immutable images, and signed OPA bundles.
2. **Detect:** tamper-evident audit chains, SIEM forwarding, OpenTelemetry correlation,
   vulnerability and drift scanning, authentication-abuse alerts, IoMT anomaly detection,
   and PHI-access analytics.
3. **Respond:** session and workload isolation, credential rotation, fail-closed OPA/audit
   dependencies, clinical-safe states, evidence preservation, signed rollback, and rehearsed
   incident playbooks.
4. **Recover:** encrypted tested backups, cross-account immutable copies, point-in-time
   recovery, reconciliation before clinical message replay, and documented RTO/RPO evidence.

## Mandatory verification

Every release runs unit/integration tests, tenant-isolation and RBAC-negative tests, OPA tests,
audit integrity checks, SAST, dependency and secret scans, IaC and container scans, DAST,
SBOM generation, signature verification, and the static production-readiness gate. At least
annually—and after material architecture changes—an independent qualified team performs
penetration testing. High-risk clinical and privacy changes require threat-model, DPIA, and
clinical-safety review.

## Residual risk

No architecture prevents every malicious action. Compromise of approved administrators,
upstream clinical systems, firmware supply chains, cloud control planes, or cryptographic
roots remains possible. Controls reduce likelihood and blast radius; named accountable owners
must accept or remediate residual risks before production. Regulatory mappings are evidence
support and do not themselves constitute certification.
