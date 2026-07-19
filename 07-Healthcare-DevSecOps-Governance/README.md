# HealthGov — Healthcare DevSecOps Governance Platform

The complete deliverables are indexed in the requested order in
[docs/ordered-output/DELIVERABLES.md](docs/ordered-output/DELIVERABLES.md).

Stakeholder-critical compliance, risk, incident, RBAC, audit, data-lake, observability,
marketplace, API, database, IaC, and procurement documentation is indexed in
[stakeholder-integrations/README.md](stakeholder-integrations/README.md).

Production-oriented reference platform for protecting PHI and clinical data, integrating FHIR, HL7,
DICOM, SMART on FHIR and IoMT, and continuously enforcing HIPAA, GDPR, FDA 21 CFR Part 11,
ISO 13485 and ISO 14971 controls across software delivery and runtime environments.

> Compliance is an organizational outcome. This project provides technical safeguards and evidence, but
> does not by itself certify regulatory compliance. Complete a threat model, DPIA, BAA/DPA review,
> penetration test, recovery exercise, and control-owner approval before production use.

## Architecture

```text
Users -> OIDC/MFA -> WAF/Envoy (JWT, mTLS, rate limit, purpose)
                         |
       +-----------------+------------------+
       |                 |                  |
Developer Portal   PHI Classifier   Compliance Engine -> OPA/Rego
       |                 |                  |
       +-------- CI/CD Orchestrator --------+
                         |
   Semgrep -> Snyk -> Checkov -> Trivy -> ZAP -> Cosign
                         |
             private EKS + policy admission
                   /                  \
       PostgreSQL/KMS/TLS          Redis/TLS
                   \                  /
           Audit Service -> Wazuh/Splunk/SOC
                    -> Prometheus/Grafana
```

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for trust boundaries and design decisions.

## Repository structure

```text
.
├── .github/workflows/          # SAST, dependency, IaC, container, DAST, signing, deploy
├── services/
│   ├── phi-classifier/         # PHI tagging and required-control recommendations
│   ├── compliance-engine/      # OPA decision facade
│   ├── cicd-orchestrator/      # Mandatory release gate aggregation
│   └── audit-service/          # Tamper-evident PHI access audit intake
├── shared/healthgov/           # JWT/RBAC, settings, crypto, logging, metrics
├── portal/                     # Next.js security and compliance dashboard
├── policies/
│   ├── hipaa/                  # Access, purpose, audit, transport controls
│   ├── gdpr/                   # Lawfulness, minimization, retention, transfer controls
│   └── kubernetes/             # Admission policy
├── infra/
│   ├── terraform/              # VPC, private EKS, encrypted RDS and Redis
│   └── kubernetes/             # Restricted workloads, policies, PDB and HPA
├── gateway/                    # Envoy TLS/JWT/RBAC routing and ZAP policy
├── observability/              # Prometheus, Wazuh and Splunk configuration
├── docs/                       # Architecture, security and incident runbooks
├── tests/                      # Security primitive tests
├── Dockerfile                  # Non-root shared service image
├── compose.yaml                # Local-only development stack
└── pyproject.toml              # Python dependencies and quality policy
```

## Local development

Requirements: Python 3.12, Docker, OPA, Node.js 22.

```bash
cp .env.example .env
python -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
pytest
opa test policies -v
docker compose up --build
```

The APIs listen on ports 8001–8004 and OPA on 8181. Authentication remains enabled by design. Configure
the local `.env` to use a development OIDC issuer; do not add a production authentication bypass.

For the portal:

```bash
cd portal
npm install
npm run dev
```

## Production bootstrap

1. Create the remote encrypted Terraform state bucket and lock table outside this stack.
2. Replace organization, account, OIDC, image, domain, and secret placeholders.
3. Configure GitHub environment protection and cloud federation; do not store AWS access keys.
4. Run `terraform init`, review `terraform plan`, and apply through an approved infrastructure workflow.
5. Install external-secrets/Secrets Store CSI, an mTLS service mesh, OPA Gatekeeper, Prometheus, and a
   supported log forwarder through pinned, reviewed charts.
6. Publish signed policy bundles and images, replace `IMAGE_TAG` with an immutable digest, then deploy.

## Security gates

Pull requests must pass unit/lint checks, Semgrep SAST, Snyk dependency analysis, Checkov Terraform/
Kubernetes analysis, and OPA tests. Main builds are scanned with Trivy and signed with keyless Cosign.
Staging deployments run OWASP ZAP; production verifies signatures and uses protected approval.

See [docs/SECURITY.md](docs/SECURITY.md) for PHI rules, identity, secrets, vulnerability policy, and the
shared-responsibility model.

## Extended clinical platform

The repository also includes:

- `interoperability-gateway`: FHIR R4, SMART discovery, HL7 v2 and DICOM quarantine.
- `iomt-security-hub`: device identity, attestation, anti-replay telemetry and firmware governance.
- `risk-engine`: STRIDE, LINDDUN and ISO 14971 risk scoring.
- `deidentification-service`: HIPAA Safe Harbor baseline and governed synthetic-data workflow.
- `ml-security`: clinical-model provenance, subgroup performance, drift and human-oversight gates.
- `data-ingestion`: Synthea, FHIR, HL7 v2, DICOM, IoMT and MIMIC-IV normalization/streaming.
- `interop/` and `iomt/`: deployable protocol and device-edge configurations.
- `infra/terraform/modules/{eks,aks,gke,onprem}`: AWS, Azure, GCP and hybrid baselines.
- `policies/{fda,iso13485,iso14971}`: regulated evidence and risk controls.

Regulated-system references:

- [Threat model](docs/threat-models/PLATFORM.md)
- [Compliance control matrix](docs/compliance/CONTROL-MATRIX.md)
- [IoMT incident playbook](docs/playbooks/IOMT-INCIDENT.md)
- [Clinical data breach playbook](docs/playbooks/CLINICAL-DATA-BREACH.md)
