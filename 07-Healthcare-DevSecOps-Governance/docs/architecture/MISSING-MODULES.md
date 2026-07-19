# Healthcare governance completion modules

## Architecture

```text
Synthea / governed generator          Cloud, IAM, CI/CD, EHR and SIEM evidence
              |                                      |
              v                                      v
 synthetic-phi-service                 compliance-event-service
 FHIR | HL7 | compliance | IoMT        parse | map | drift | score
              \                                      /
               +---------- Kafka / API gateway -----+
                                  |
                 +----------------+----------------+
                 |                |                |
          dsp-toolkit-service iso27001-service soc2-service
          DSPT 2025-26 v8     Annex A (93)     Trust Services Criteria
                 \                |                /
                  +---- OPA policy decisions -----+
                                  |
                    PostgreSQL tenant RLS
                    evidence + controls + drift
                                  |
 Medical devices -> mTLS gateway -> iomt-security-service
                                  identity registry
                                  firmware + SBOM scans
                                  normalized telemetry
                                  anomaly and risk scoring
                                  |
                    BFF -> Next.js dashboards
```

All browser access traverses the same-origin BFF. Services derive the tenant from a verified
JWT and set transaction-local `app.current_tenant`; callers cannot select another tenant.
Evidence artifacts remain in immutable object storage and the database stores their digests
and lineage.

## Repository layout

```text
services/
  synthetic-phi-service/app/
  compliance-event-service/app/
  dsp-toolkit-service/app/
  iso27001-service/app/
  soc2-service/app/
  iomt-security-service/app/
shared/healthgov/
  control_catalogs.py
  framework_api.py
  frameworks.py
stakeholder-integrations/database/
  002_missing_modules.sql
policies/
  nhs-dsp/{toolkit,coverage}.rego
  iso27001/{readiness,annex_a_coverage}.rego
  soc2/{readiness,tsc_coverage}.rego
portal/app/(dashboard)/
  synthetic-phi/ compliance-events/ dsp-toolkit/
  iso27001/ soc2/ iomt-security/
```

## APIs

| Service | Endpoints |
|---|---|
| Synthetic PHI | `POST /v1/generate/{fhir,hl7,compliance,iomt,all}` |
| Compliance events | `POST/GET /v1/events`, `POST /v1/controls/map`, `/v1/drift`, `/v1/score` |
| DSP Toolkit | `GET /v1/controls`, `POST /v1/evidence`, `/v1/score`, `GET /v1/dashboard` |
| ISO 27001 | Same framework API; catalog covers all 93 Annex A identifiers |
| SOC 2 | Same framework API; Common Criteria and optional TSC category mappings |
| IoMT security | `GET /v1/device-profiles`, `POST/GET /v1/devices`, `POST /v1/firmware/scans`, `POST /v1/telemetry`, `GET /v1/posture` |

## Development and deployment

1. Apply `001_stakeholder_schema.sql`, then `002_missing_modules.sql` using a migration
   identity that is not used by application workloads.
2. Supply `DATABASE_URL`, `JWKS_URL`, `JWT_ISSUER`, `JWT_AUDIENCE`, OPA URL, and secret-manager
   references. Never put evidence contents, real PHI, or private device keys in environment
   variables.
3. Build a service with
   `docker build --build-arg SERVICE=synthetic-phi-service -t synthetic-phi-service .`.
4. Apply the Kubernetes base after External Secrets has created runtime database credentials.
5. Configure the BFF proxy routes shown in `gateway/envoy.yaml`.
6. Run `opa test policies`, Python tests/lint, and the portal typecheck/build before promotion.

Synthetic output is tagged `SYNTHETIC`, has a bounded count, and is intended only for
non-production test environments. It must not be linked with real identities. IoMT anomaly
rules are safety-supporting security signals, not clinical decision logic.

## Framework maintenance

The NHS profile is pinned to DSP Toolkit 2025-26 Version 8 and must load the evidence pack
applicable to the organisation type; the shared catalog is the cross-profile control baseline.
ISO catalog identifiers cover the 93 controls in ISO/IEC 27001:2022 Annex A without copying
licensed control text. SOC 2 mapping follows the 2017 Trust Services Criteria with revised
points of focus (2022). Compliance owners must review catalogs at least annually and on every
framework release. Automated scores indicate readiness and do not constitute certification or
an auditor's opinion.
