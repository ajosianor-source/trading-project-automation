# Architecture

The completion-module architecture, APIs, schemas, and operational instructions are documented
in [architecture/MISSING-MODULES.md](architecture/MISSING-MODULES.md).

## High-level system

```text
 Clinicians / Developers / Security / Privacy
                    |
             OIDC + MFA + TLS 1.3
                    |
          [WAF / Envoy API Gateway]
        JWT | mTLS | rate limits | RBAC
                    |
  +-----------------+------------------+
  |                 |                  |
[Developer]   [PHI Classifier]  [Compliance Engine]---->[OPA]
[Portal]       tag/tokenize       HIPAA/GDPR            Rego bundles
  |                 |                  |
  +----------[CI/CD Orchestrator]------+
                    |
  Semgrep -> Snyk -> Checkov -> Trivy -> ZAP -> Cosign
                    |
          Signed OCI images + provenance
                    |
       Private EKS / Pod Security / mTLS mesh
                    |
      +-------------+--------------+
      |                            |
[RDS PostgreSQL]             [Redis TLS]
AES-256 KMS / Multi-AZ       encrypted / Multi-AZ
      |
 [Audit Service] -> immutable log archive -> Wazuh / Splunk
      |                                      |
 Prometheus / Grafana <---------------- Alerts / SOC

Control plane: Terraform state (encrypted + locked), GitHub OIDC,
AWS KMS/Secrets Manager, IRSA least privilege, private endpoints.
```

## Trust boundaries and data flow

1. The edge validates issuer, audience, signature, client identity, rate limit, and purpose-of-use.
2. Each service repeats authorization; the gateway is not treated as a trust substitute.
3. PHI fields are encrypted with AEAD and tenant/resource context; lookup values use keyed tokens.
4. Raw PHI never enters application logs. Audit records use opaque resource IDs and patient tokens.
5. OPA returns deterministic compliance decisions. A failed or unavailable policy engine blocks release.
6. Images are scanned, signed keylessly with GitHub OIDC, and verified before deployment.

## Security decisions

- Use private EKS and databases; no public control-plane or data endpoints.
- Use short-lived workload identity via IRSA. Static cloud credentials are prohibited.
- Inject secrets at runtime from AWS Secrets Manager/Vault; never use Kubernetes Secret manifests in Git.
- Keep audit events append-only with object lock in the production archive.
- Separate application telemetry from PHI audit events and restrict SOC access through dedicated roles.
- Retention values are configuration governed by legal/privacy owners; examples are not legal advice.

## Services

| Service | Responsibility | Data sensitivity |
|---|---|---|
| `phi-classifier` | Field-name/pattern classification and control tags | Samples may contain PHI; do not persist |
| `compliance-engine` | OPA decision facade and evidence | Compliance metadata |
| `cicd-orchestrator` | Aggregates mandatory release gates | Build metadata |
| `audit-service` | Creates tamper-evident PHI access events | Security audit metadata |
| `portal` | Read-only posture and evidence dashboard | Aggregated metadata |
| `interoperability-gateway` | FHIR R4, SMART, HL7 v2 and DICOM quarantine | PHI and clinical data |
| `iomt-security-hub` | Device identity, attestation, telemetry and firmware posture | Device and clinical data |
| `risk-engine` | STRIDE, LINDDUN and ISO 14971 risk scoring | Risk metadata |
| `deidentification-service` | Safe Harbor and governed synthetic-data workflow | PHI in; de-identified out |
| `ml-security` | Clinical model provenance, drift, bias and oversight gates | Model metadata |
| `tenant-service` | Tenant lifecycle, residency, keys, topics and quotas | Tenant metadata |
| `plugin-registry` | Signed plugin admission, permissions and sandbox policy | Plugin metadata |
| `reporting-service` | Signed, tenant-scoped compliance reports and evidence manifests | Compliance evidence |
| `data-ingestion` | Normalizes Synthea, FHIR, HL7, DICOM, IoMT and MIMIC-IV streams | PHI/clinical/device |

## Multi-cloud and hybrid topology

```text
 Hospital / Edge                 Regional cloud landing zones
 +------------------+            +--------+ +--------+ +--------+
 | IoMT VLAN        |--mTLS/VPN--|  AWS   | | Azure  | |  GCP   |
 | MQTT / CoAP      |            |  EKS   | |  AKS   | |  GKE   |
 | DICOM / HL7      |            +---+----+ +---+----+ +---+----+
 | K3s/OpenShift    |                +----------+----------+
 +--------+---------+                           |
          +---------- Kafka replicated events--+
                             |
                Global identity, Vault/KMS, policy bundles,
                evidence archive, SIEM and disaster recovery
```

Clinical and device traffic terminates locally when care continuity requires it. Only approved,
minimized and encrypted events cross site boundaries. Data residency and replication topology are
deployment decisions owned by privacy, legal, clinical safety and platform operations.

## Three-path integration

- Enterprise deployments use dedicated landing zones and private clinical/device connectors. Large
  organizations may receive dedicated databases, Kafka clusters and keys while retaining the common API
  and evidence contracts.
- Commercial SaaS uses a shared control plane with forced PostgreSQL RLS, per-tenant key hierarchy,
  tenant-keyed Kafka ACLs, regional placement, quotas and signed plugin admission. Enterprise tenants can
  select stronger physical isolation without changing application contracts.
- Innovation workloads operate in a separate AI trust zone. Models, datasets and federated updates are
  signed and versioned; synthetic records are marked; secure aggregation and privacy budgets are policy
  decisions; clinical promotion still requires human quality and safety approval.

No service trusts an `X-Tenant-ID` header on its own. The requested tenant must match the signed token
claim, database transactions set a local RLS context, and events use the authenticated tenant as their
partition/authorization key.
