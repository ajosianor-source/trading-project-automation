# Ingestion CI/CD

Workflow: `.github/workflows/ingestion.yml`

## Trigger behavior

| Trigger | Generated adapter checks | Live ingestion | Railway deployment |
|---|---:|---:|---:|
| Push to `main` | Yes | No | Yes |
| Cron (`17 */6 * * *`) | Yes | Only when enabled | No |
| Manual | Yes | Optional input | Optional input |

GitHub cron schedules use UTC. Scheduled workflows run from the latest commit on the default branch.
The concurrency group does not cancel an active ingestion run.

## Security boundary

GitHub-hosted runners execute every script with generated, non-clinical fixtures. They must never receive
live PHI, DICOM studies, raw HL7 messages, MIMIC data, production tokens or production database exports.

Live pipelines use an ephemeral self-hosted Linux runner labeled:

```text
self-hosted, linux, x64, healthcare-ingestion
```

Place that runner inside the approved healthcare network with encrypted ephemeral storage, restricted
egress, no interactive user access, centralized audit logging and automatic destruction after each job.
Protect the `healthcare-ingestion` GitHub environment with required reviewers.

## GitHub secrets

Add secrets under **Repository settings → Secrets and variables → Actions**. Prefer environment secrets
for `healthcare-ingestion` and `production`.

Required production deployment secret:

| Secret | Purpose |
|---|---|
| `RAILWAY_TOKEN` | Railway project/service token used by `railway up --service ingestion` |

Live-ingestion secrets:

| Secret | Purpose |
|---|---|
| `INGESTION_DATABASE_URL` | Railway/private PostgreSQL connection |
| `INGESTION_KAFKA_BOOTSTRAP_SERVERS` | Managed Kafka brokers |
| `INGESTION_TOKENIZATION_SECRET` | HMAC key, at least 32 random characters |
| `HAPI_FHIR_TOKEN` | Short-lived/scoped HAPI FHIR credential |

Repository/environment variables:

| Variable | Purpose |
|---|---|
| `ENABLE_LIVE_INGESTION` | Must equal `true` for cron live ingestion |
| `INGESTION_TENANT_ID` | Approved tenant for the scheduled run |
| `INGESTION_KAFKA_CA_PATH` | CA path already provisioned on the runner |
| `HAPI_FHIR_BASE_URL` | Allowlisted HAPI FHIR base URL |
| `SYNTHEA_OUTPUT_DIR` | Runner-local Synthea directory |
| `MIMIC_DATA_DIR` | Approved runner-local MIMIC-IV directory |

Do not use secrets in `if:` expressions or echo them. GitHub masking is a secondary safeguard, not
authorization. Rotate the Railway token and ingestion credentials regularly.

## Modify the schedule

Edit:

```yaml
on:
  schedule:
    - cron: "17 */6 * * *"
```

Examples:

```text
17 */6 * * *   Every six hours at minute 17
30 2 * * *     Daily at 02:30 UTC
15 3 * * 1     Mondays at 03:15 UTC
```

Stagger workloads away from minute zero. Confirm source-system load windows, data latency objectives,
clinical change freezes and maintenance periods before increasing frequency.

## Add a new ingestion pipeline

1. Add a pipeline under `app/pipelines/` using the canonical `ClinicalEnvelope`.
2. Add its allowed topic to `EventRouter.TOPICS`.
3. Add a generated-fixture branch in `app/cli_checks.py`.
4. Add an executable root entry point, for example `claims_ingest.py`.
5. Add unit tests for parsing, classification, tokenization, integrity and routing.
6. Add a named workflow step to `validate-and-exercise`.
7. Add the pipeline to the orchestrator allowlist only if it supports unattended execution.
8. Add necessary self-hosted-runner variables/secrets without exposing them to hosted jobs.
9. Update the README, threat model, data-flow inventory, retention policy and compliance mapping.

Push-driven sources such as HL7 and DICOM should usually remain API/gateway driven. Do not invent a
scheduled directory scan unless duplicate handling, file ownership, quarantine, replay and acknowledgements
have been designed.

## Failure handling and logs

Every script step uses `set -Eeuo pipefail`; a parser or routing failure fails the job even when output is
piped through `tee`. Redacted logs upload for seven days with `if: always()`. Application logging forbids
payloads and direct identifiers.

The live orchestrator exits nonzero when any selected pipeline rejects input. Railway deployment depends
on the generated-data validation job and uses the protected `production` environment.

