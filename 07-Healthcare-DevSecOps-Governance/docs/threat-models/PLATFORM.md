# Platform threat model

## Scope and method

This model covers clinical ingress, PHI services, regulated evidence, software delivery, medical-device
telemetry, and cloud/on-prem control planes. It uses STRIDE for security, LINDDUN for privacy, and
ISO 14971 for safety risk. Owners must review it for every material architecture or intended-use change.

| Boundary | Threat | Impact | Required controls | Evidence |
|---|---|---|---|---|
| SMART/FHIR edge | Token substitution or excessive scopes | PHI disclosure | PKCE S256, issuer/audience validation, granular scopes, purpose-of-use | Auth decision + access event |
| HL7/DICOM ingress | Parser exploit or embedded payload | Clinical disruption | Quarantine, size limits, schema validation, sandbox, malware scan | Scan result + message digest |
| IoMT network | Device impersonation/replay | Unsafe or false telemetry | IDevID, mTLS 1.3, attestation, sequence and time window | Attestation + telemetry decision |
| Kafka | Event tampering or cross-tenant read | Integrity/privacy loss | TLS, SASL, topic ACL, idempotence, schema registry | Broker audit + schema version |
| CI/CD | Dependency or build compromise | Fleet-wide compromise | SAST/SCA, hermetic build, SBOM, provenance, signature | Signed release evidence |
| ML lifecycle | Drift, bias, poisoning, unsafe use | Clinical harm | Dataset lineage, subgroup tests, drift gates, human oversight | Model card + approval |
| Audit trail | Deletion or administrator alteration | Part 11 failure | Append-only archive, object lock, hash chain, separated role | Integrity verification |

## LINDDUN privacy analysis

- Linkability: token namespaces are purpose-specific; analytics cannot join clinical identities by default.
- Identifiability: Safe Harbor is a baseline; high-dimensional clinical and imaging data require expert
  determination and re-identification testing.
- Non-repudiation: audit events are necessary for accountability but access is segregated and retained only
  under approved schedules.
- Detectability/disclosure: encrypted traffic, padding where justified, private endpoints, and metadata
  minimization reduce exposure.
- Unawareness/intervenability: notices, consent/lawful-basis records, correction, export, restriction, and
  deletion workflows must be integrated with the source EHR.

## Safety linkage

Security hazards that may cause clinical harm are entered in the ISO 14971 risk file. Residual risk is not
accepted by engineering alone: clinical safety, quality, product, and security approval is required.

