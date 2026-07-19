# Production approval gate

Production is denied until every automated gate in
`governance/production-gates.json` passes and the protected GitHub `production`
environment records approvals from the product, security, privacy, clinical safety,
data protection, and operations owners.

## Required evidence

- Immutable commit SHA, SBOM, provenance attestation, and verified image signatures.
- SAST, secret, dependency, container, IaC, DAST, OPA, tenant-isolation, RBAC-negative,
  audit-chain, backup-restore, load, and failover results.
- Approved DPIA, clinical safety case, data-source record, threat model, residual-risk
  register, disaster-recovery result, and incident-response exercise.
- Named on-call owner, rollback decision maker, maintenance window, and change ticket.

## Explicit boundaries

The local BFF, default credentials, plaintext Kafka, synthetic staging identities, and
developer Compose topology are prohibited in production. Production uses an approved
OIDC provider, workload identity, managed KMS/HSM-backed secrets, private endpoints,
TLS/SASL Kafka, encrypted managed databases, WAF/DDoS controls, and immutable audit
retention. A human owner must accept every documented residual risk; automation cannot
grant regulatory certification or clinical approval.
