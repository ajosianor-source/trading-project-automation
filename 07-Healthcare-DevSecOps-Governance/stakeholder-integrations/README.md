# HealthGov stakeholder integrations

This module connects the platform’s ingestion, clinical data store, security controls, and
portal into an enterprise governance plane suitable for hospital leadership, assessors,
vendors, manufacturers, procurement teams, and investors.

## Enterprise architecture

```text
Users and stakeholders
 CIO / CISO / DPO / NHS assessor / Auditor / Developer / Executive
                              │
                     SSO + phishing-resistant MFA
                              │
                    Envoy zero-trust API gateway
       JWT · SMART scopes · mTLS · RBAC · purpose · WAF · rate limits
                              │
 ┌────────────────────────────┼─────────────────────────────────────┐
 │ Governance plane           │ Operations plane                    │
 │                            │                                     │
 │ Compliance ─ OPA/Rego      │ Alerting ─ Email/SMS/Slack          │
 │ Evidence ─ Drift ─ Reports │ Jira/ServiceNow ─ Playbooks         │
 │ Risk ─ STRIDE/LINDDUN      │ Audit chain ─ Forensic object lock  │
 │ RBAC ─ Tenant scopes       │ Prometheus/Grafana/OTel/Wazuh       │
 │ Plugin registry            │ Splunk/SIEM                         │
 └──────────────┬─────────────┴──────────────────┬──────────────────┘
                │                                │
 ┌──────────────▼────────────────────────────────▼──────────────────┐
 │ Healthcare and AI data plane                                    │
 │ FHIR · HL7 · DICOM · IoMT · ICU/MIMIC · PHI classification      │
 │ PostgreSQL RLS · Kafka ACLs · Redis · Vault · immutable lake     │
 │ S3/Blob/GCS · Parquet/Delta · Athena/BigQuery · OpenLineage       │
 └──────────────┬────────────────────────────────┬──────────────────┘
                │                                │
      AI/ML security lifecycle          Healthcare marketplace
      signing · SBOM · adversarial      Epic · Cerner · Meditech
      drift · federation · synthetic    Firely · Redox · AHDS · HealthLake
```

Trust boundaries are enforced at the gateway, service identity, tenant-aware database
transaction, message-bus ACL, and encrypted object-store layer. The dashboard never
connects directly to databases, SIEMs, EHRs, devices, or data lakes.

## Repository structure

```text
stakeholder-integrations/
├── api/openapi.yaml
├── database/001_stakeholder_schema.sql
├── playbooks/incident-response.md
├── docs/
└── README.md

services/
├── compliance-engine/          # HIPAA/GDPR/NHS DSPT/ISO/SOC 2 evidence and drift
├── risk-engine/                # PHI/IoMT/FHIR/AI/compliance risk and heatmaps
├── alerting-engine/            # notifications, escalation, tickets, forensics
├── rbac-service/               # six stakeholder roles and scoped authorization
├── audit-service/              # chained append-only audit events
├── plugin-registry/            # signed, permissioned plugin assessment
├── data-lake-connector/        # S3/Blob/GCS, Parquet/Delta, catalog/lineage
├── ml-security/                # model, adversarial, drift, federation controls
├── observability-service/      # metrics, traces, Wazuh/Splunk routing
├── healthcare-marketplace/     # healthcare vendor connection validation
└── reporting-service/          # signed audit and executive packs

portal/app/(dashboard)/
├── compliance/
├── risk/
├── incidents/
├── audit/
├── marketplace/
└── page.tsx                    # executive analytics

infra/terraform/modules/
├── observability/
├── api-gateway/
├── data-lake/
└── rbac/
```

## Integration responsibilities

| Module | Input | Durable output | Downstream |
|---|---|---|---|
| Compliance | cloud, CI, identity, app evidence | evidence hashes and control state | reports, alerts, dashboard |
| Risk | exposure, asset, threat, control evidence | versioned risk register | executives, ISO 14971, alerts |
| Alerting | normalized findings | alert and escalation history | Slack/email/SMS/Jira/ServiceNow |
| RBAC | identity claims and assignments | scoped role bindings | gateway and every service |
| Audit | PHI/FHIR/HL7/IoMT/AI events | chained immutable ledger | SIEM, forensics, auditors |
| Data lake | de-identified event projections | encrypted Parquet/Delta | Athena/BigQuery/catalog |
| ML security | model artifact and evaluation | model approval record | deployment gate and monitoring |
| Marketplace | vendor connection profile | secret reference and validation | interoperability gateway |

## Role model

| Role | Primary access |
|---|---|
| Admin | tenant configuration, assignments, connectors |
| Security Analyst | incidents, security findings, PHI and IoMT investigations |
| Compliance Officer | controls, evidence, drift, reports |
| Developer | APIs, plugins, pipeline findings, sandbox connectors |
| Auditor | read-only evidence, audit chain, risks, reports |
| Executive | aggregated posture, ROI, risk, incident, fleet, and model trends |

The identity provider issues roles and tenant claims. The gateway verifies them. Services
repeat authorization and tenant checks. UI hiding is convenience only and is never an
authorization boundary.

## Compliance automation

OPA packages now include HIPAA, GDPR, NHS DSP Toolkit, ISO 27001, SOC 2, FDA 21 CFR Part
11, ISO 13485, and ISO 14971. Evidence records contain a cryptographic artifact hash,
collector, observation window, freshness date, and control status. Drift compares the
approved baseline with observed state and can open an incident.

Control mappings are implementation aids, not certifications. Control owners and qualified
assessors must approve applicability, evidence quality, risk acceptance, and regulatory
interpretation.

## Data lake and lineage

Only approved projections may leave operational stores. A policy check must confirm:

- de-identification or documented lawful purpose;
- tenant, residency, retention, and legal-hold rules;
- customer-managed encryption and private network access;
- Parquet/Delta schema version and partition strategy;
- OpenLineage event and catalog registration;
- query-engine workgroup controls and cost limits.

The connector uses secret references such as `vault://...`; cloud credentials are never
accepted in API requests.

## Marketplace integration

All connectors use standards-based interfaces where vendors expose them:

- Epic, Cerner, Meditech, Firely: FHIR R4 and SMART on FHIR capability validation.
- Redox: governed network/API integration with tenant-specific routing.
- Azure Health Data Services and AWS HealthLake: private cloud identity, residency,
  encryption, and audit validation.

Vendor certification, commercial agreements, sandbox credentials, and production endpoint
allowlisting remain customer/vendor onboarding tasks.

## Deployment sequence

1. Provision KMS, Vault, identity, private networking, PostgreSQL, Kafka, and object lock.
2. Apply `database/001_stakeholder_schema.sql` using a migration role.
3. Deploy OPA and signed policy bundles.
4. Deploy service identities and RBAC before application workloads.
5. Deploy audit and observability first, then gateway, governance services, and portal.
6. Configure alert destinations using Vault references.
7. Run disaster recovery, incident, tenant-isolation, audit-integrity, and evidence tests.
8. Obtain control-owner and clinical-safety approval before production traffic.

## Validation

```bash
ruff check services shared
pytest -q
opa test policies -v
terraform fmt -check -recursive infra/terraform
cd portal && npm ci && npm run typecheck && npm run build
```

The stakeholder security workflow also runs Semgrep, Trivy, Checkov, optional Snyk,
compliance policy tests, alert/risk import checks, and audit integrity checks.
