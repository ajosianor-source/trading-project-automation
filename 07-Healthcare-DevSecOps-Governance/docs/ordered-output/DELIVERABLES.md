# HealthGov ordered deliverables

## 1. High-level architecture diagram

```text
 ENTERPRISE PATH                 COMMERCIAL SAAS PATH              INNOVATION / AI PATH
 Hospitals / EHR / PACS         Tenant admins / partners          Data science / research sites
 IoMT / medical devices         Executive / SOC users             Federated participants
          |                               |                                  |
 FHIR | SMART | HL7 | DICOM       OIDC + tenant claim                Attested FL clients
 MQTT/CoAP + device mTLS          WAF / quota / subscription         Secure aggregation + DP
          +-------------------------------+----------------------------------+
                                          |
                         Envoy API Gateway / service mesh
                    JWT + mTLS + RBAC + purpose + tenant + rate limit
                                          |
   +--------------------+------------------+------------------+-------------------+
   | PHI protection     | Compliance/QA    | SaaS control     | Clinical AI       |
   | classify/encrypt   | HIPAA/GDPR/FDA   | tenant/plugin    | scan/adversarial  |
   | tokenize/de-id     | ISO 13485/14971  | reports/quotas   | drift/federated   |
   +--------------------+------------------+------------------+-------------------+
                         | OPA decisions and Kafka events |
            PostgreSQL RLS | Redis | object-locked evidence | model registry
                                          |
                EKS / AKS / GKE / OpenShift / K3s trust zones
                                          |
          Wazuh + Splunk + Prometheus + Grafana + incident/CAPA workflows
```

Full design: [Architecture](../ARCHITECTURE.md).

## 2. Full folder structure

The final repository map is in section 13. Major roots are `services`, `shared`, `portal`, `plugins`,
`ai`, `interop`, `iomt`, `policies`, `database`, `infra`, `gateway`, `observability`, `docs`, and
`.github/workflows`.

## 3. Code scaffolding for each service

Twelve independently deployable FastAPI services live in `services/`. Shared JWT, tenant context,
cryptography, de-identification, Kafka, middleware and database primitives live in `shared/healthgov`.
Each service exposes `/healthz`, `/metrics`, an OpenAPI contract and versioned APIs.

## 4. CI/CD pipeline YAML files

`.github/workflows` contains pull-request security gates, DAST, signed deployment, firmware analysis,
and clinical-model security. Gates cover Ruff/tests, Semgrep, Snyk, Checkov, OPA, Trivy, ZAP, SBOM,
Cosign signatures, provenance and immutable image deployment.

## 5. Terraform modules and Kubernetes manifests

`infra/terraform` contains AWS EKS/RDS/Redis, Azure AKS, GCP GKE and on-prem K3s/OpenShift baselines.
`infra/kubernetes` contains restricted workload baselines plus clinical, IoMT, SaaS and AI trust-zone
components.

## 6. OPA Rego policies

`policies` contains HIPAA, GDPR, FDA 21 CFR Part 11, ISO 13485, ISO 14971, Kubernetes admission,
tenant-isolation and plugin-governance policies with tests.

## 7. Interoperability configs

`interop` contains a FHIR R4 capability statement, SMART client/discovery configuration, TLS HL7 v2
channel policy and DICOM quarantine/anonymization settings. The corresponding API edge is
`services/interoperability-gateway`.

## 8. IoMT security components

`iomt` contains certificate-only MQTT configuration, topic ACLs and firmware scan policy.
`services/iomt-security-hub` implements device identity, secure/measured boot attestation and anti-replay
telemetry admission.

## 9. AI/ML security components

`ai` contains serialization/model scanning policy, adversarial thresholds and federated-learning security.
`services/ml-security` implements provenance, drift, subgroup, privacy-attack and federated-round gates.
`services/deidentification-service` supplies Safe Harbor and non-source-derived synthetic test records.

## 10. Logging, monitoring, SIEM and incident response

`observability` contains Prometheus alerts, an executive Grafana dashboard, Wazuh correlation rules and
Splunk parsing/searches. `docs/playbooks` and `docs/runbooks.md` cover PHI, clinical interface, IoMT,
policy-engine, audit and clinical-model incidents.

## 11. Developer and security documentation

The repository provides architecture, security operations, threat model, compliance mapping, runbooks,
local development, production bootstrap and an in-product API-contract explorer under
`portal/app/api-docs`.

## 12. Commercial SaaS components

`tenant-service`, `plugin-registry` and `reporting-service` implement the control plane. PostgreSQL forced
RLS, token/header tenant binding, tenant-keyed events, per-tenant keys/topics, digest-pinned plugins,
gVisor isolation, explicit permissions and signed evidence reports prevent cross-tenant trust leakage.

## 13. Final GitHub repository structure

```text
.
|-- .github/workflows/          # security, DAST, deploy, firmware, model gates
|-- ai/                         # model, adversarial and federated policies
|-- database/migrations/        # PostgreSQL tenant RLS
|-- docs/
|   |-- compliance/             # framework control mapping
|   |-- ordered-output/         # this 13-part delivery index
|   |-- playbooks/              # clinical and IoMT incident response
|   `-- threat-models/          # STRIDE/LINDDUN/ISO 14971 model
|-- gateway/                    # Envoy JWT, mTLS, RBAC and routing
|-- infra/
|   |-- kubernetes/             # base + clinical/IoMT/SaaS/AI components
|   `-- terraform/              # AWS, Azure, GCP and on-prem modules
|-- interop/                    # FHIR, SMART, HL7 v2 and DICOM
|-- iomt/                       # MQTT ACLs and firmware policy
|-- observability/              # Prometheus, Grafana, Wazuh and Splunk
|-- plugins/
|   |-- sdk/                    # typed Python plugin contract
|   `-- examples/               # sandboxed example manifest
|-- policies/                   # HIPAA/GDPR/FDA/ISO/K8s/SaaS Rego
|-- portal/                     # Next.js executive and developer portal
|-- services/
|   |-- audit-service/
|   |-- cicd-orchestrator/
|   |-- compliance-engine/
|   |-- deidentification-service/
|   |-- interoperability-gateway/
|   |-- iomt-security-hub/
|   |-- ml-security/
|   |-- phi-classifier/
|   |-- plugin-registry/
|   |-- reporting-service/
|   |-- risk-engine/
|   `-- tenant-service/
|-- shared/healthgov/           # security and platform primitives
|-- tests/
|-- compose.yaml
|-- Dockerfile
|-- Makefile
|-- pyproject.toml
`-- README.md
```

