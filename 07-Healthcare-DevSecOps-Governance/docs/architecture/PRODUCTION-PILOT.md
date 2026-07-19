# Controlled production pilot architecture

## 1. High-level architecture

```text
Workforce / SMART apps / medical devices
            |
 Entra ID + FIDO2 + PKCE             IDevID + mTLS + signed telemetry
            |                                      |
       WAF / DDoS / private API gateway / rate limits
            |
   JWT + tenant + role + purpose + OPA authorization
            |
+-----------+--------------+-------------------+------------------+
| Portal/BFF | Interop API | Governance APIs   | IoMT security    |
+-----------+--------------+-------------------+------------------+
            | normalized, tokenized, provenance-tagged events
       Managed Kafka (TLS + IAM/SASL, idempotent producers)
            |
    Data store + private HAPI FHIR
            |
 Managed PostgreSQL (KMS, Multi-AZ, PITR) + Redis TLS
            |
 Immutable audit/evidence object lock ----> Splunk/Wazuh
            |                                      |
 OPA bundles + evidence collectors      Prometheus/OTel/Grafana
            |                                      |
 signed CI evidence <---- security tests ----> PagerDuty/Teams/Jira
            |
 Production gate: vulnerabilities + isolation + policy + SBOM/signatures
 + DAST/pentest + restore/DR + evidence freshness + security/privacy/clinical approval
```

Real PHI is denied by policy during the pilot. Approved inputs are Synthea, BIDMC 1.0.0
and TCIA TCGA-LUAD v4. MIMIC-IV remains disabled until credentialing, training, DUA and
governance approval are recorded.

## 2. Folder changes

```text
database/migrations/004_pilot_governance.sql
governance/control-registry.json
infra/identity/entra/production.json
infra/kubernetes/components/staging-data-plane/
infra/kubernetes/overlays/staging/
infra/terraform/bootstrap/
infra/terraform/modules/{kafka,secrets,audit-evidence,waf}/
observability/alertmanager/
ops/{staging,compliance,dr}/
policies/healthcare/data_lifecycle*.rego
policies/hipaa/break_glass*.rego
tests/load/api-rate-limit.js
tests/test_pilot_adversarial.py
.github/workflows/pilot-security.yml
```

## 3–5. Infrastructure, identity and data plane

Terraform provisions private EKS, encrypted Multi-AZ PostgreSQL with 35-day PITR, encrypted
Redis, TLS/IAM MSK, KMS-backed Secrets Manager, WAF and seven-year object-lock evidence.
State uses a separately bootstrapped KMS-encrypted/versioned S3 bucket and DynamoDB locking;
only the OIDC-federated CI role receives state access.

External Secrets uses workload identity. No secret values enter Terraform state or Git.
Entra configuration requires S256 PKCE, ten-minute access tokens, phishing-resistant
authentication strength and tenant/role claims. SMART uses a distinct FHIR audience and scopes.

The ingestion producer is idempotent (`acks=all`) and fails startup when Kafka is unavailable.
Synthea publishes to private HAPI and then routes normalized events. BIDMC and TCIA provenance
comes from `ops/staging/approved-sources.json`. The loader refuses MIMIC-IV.

## 6–9. Validation, operations, compliance and governance

The pilot workflow runs tenant/RBAC/purpose, SSRF, parser, DICOM, IoMT, rate-limit, OPA and
DAST tests. Restore validation loads a recent backup into an isolated database and verifies
tenant, audit and control records. A signed evidence manifest must additionally record an
independent penetration test, RTO/RPO, zero critical/high findings, signed images/SBOMs and
four accountable approvals.

Prometheus routes critical alerts to PagerDuty and the incident router, privacy alerts to
Teams, and all security events to the SIEM and immutable audit store. The registry gives every
implemented control an owner, evidence source, frequency, retention and remediation SLA.

No release approval is inferred. DPIA, lawful basis, processor agreements, data/model boards,
clinical safety, residual risks and named security/privacy/clinical/operations sign-off are
stored as hashed approval evidence and checked by the protected production environment.

## 10. Roadmap

1. Provision private staging and external identity/secrets.
2. Record source approvals; load Synthea, BIDMC and TCGA-LUAD.
3. Execute adversarial, DAST, restore and DR exercises; remediate every high/critical issue.
4. Run evidence collectors for at least one complete control cycle.
5. Complete DPIA, clinical safety and residual-risk review.
6. Obtain independent penetration-test and accountable-owner approvals.
7. Promote immutable signed SHA to a limited tenant/device cohort with rollback ready.
8. Expand only after SLO, safety, privacy and incident-review exit criteria pass.
