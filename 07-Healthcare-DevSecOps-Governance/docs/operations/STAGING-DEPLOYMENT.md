# Local staging deployment

## Topology

- PostgreSQL 16, Redis 7, Redpanda/Kafka, and OPA run in Docker Compose.
- Governance APIs run as isolated host processes on ports 8020-8025.
- The staging OIDC/JWKS/BFF runs on port 8080.
- Audit service runs on port 8004.
- The standalone Next.js portal runs on port 3000.

The host-process application tier is a local staging profile only. Kubernetes/cloud staging
must use the signed container images and external secret manager defined by the deployment
workflows.

## Endpoints

| Component | URL |
|---|---|
| Portal | `http://127.0.0.1:3000` |
| Staging OIDC/JWKS/BFF | `http://127.0.0.1:8080` |
| Synthetic PHI | `http://127.0.0.1:8020` |
| Compliance events | `http://127.0.0.1:8021` |
| NHS DSPT | `http://127.0.0.1:8022` |
| ISO 27001 | `http://127.0.0.1:8023` |
| SOC 2 | `http://127.0.0.1:8024` |
| IoMT security | `http://127.0.0.1:8025` |
| OPA | `http://127.0.0.1:8181` |

## Security boundary

Runtime APIs use `healthgov_app`, a non-superuser PostgreSQL role. The bootstrap owner is
reserved for migrations. `003_application_role.sql` grants minimum data-plane privileges;
tenant RLS is driven by the verified JWT claim through transaction-local
`app.current_tenant`.

The local identity service is staging-only. It implements PKCE, one-time authorization codes,
short-lived RS256 tokens, JWKS, opaque BFF sessions, and server-side token forwarding. It must
never be promoted to production or exposed outside localhost.

## Validated staging state

The seeded `staging-hospital` tenant contains:

- synthetic FHIR, HL7 v2, compliance, and IoMT generation runs;
- 24 framework evidence events;
- DSPT score 47.1%;
- ISO 27001 score 8.6%;
- SOC 2 score 13.1%;
- four enrolled and trusted medical-device profiles.

The end-to-end gate proves:

- a second tenant sees zero `staging-hospital` events;
- a developer-only identity receives HTTP 403 from the compliance evidence API;
- audit events persist with a 64-character tamper-evident digest;
- OPA rejects an unsafe workload for four independent policy violations;
- the portal BFF returns the live scores and counts using an opaque browser session.

Scores are intentionally incomplete so staging visibly represents open evidence work rather
than falsely presenting certification readiness.
