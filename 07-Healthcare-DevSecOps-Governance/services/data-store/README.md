# HealthGov Clinical Data Store

Async FastAPI/PostgreSQL microservice for normalized FHIR R4, HL7 v2, DICOM metadata,
IoMT telemetry, and ICU/MIMIC data. It exposes idempotent write APIs for ingestion
workers and tenant-scoped read projections for the Next.js dashboards.

## Architecture

```text
Ingestion pipelines / Kafka consumers
  → POST /store/{source}
  → JWT tenant + writer-role enforcement
  → normalization and deterministic patient tokenization
  → integrity-based idempotency
  → source-specific PostgreSQL projection
  → /v1/dashboard/{source} tenant-filtered queries
  → Next.js React Query dashboards
```

Raw DICOM pixels, direct patient names, access tokens, and request bodies are never
written to application logs. FHIR patient display values are pseudonymous. TLS and
PostgreSQL storage encryption must be enforced by the deployment platform.

## Folder structure

```text
data-store/
├── main.py
├── auth.py
├── config.py
├── database.py
├── dependencies.py
├── routers/
│   ├── fhir.py
│   ├── hl7.py
│   ├── dicom.py
│   ├── iomt.py
│   └── icu.py
├── models/
│   ├── base.py
│   ├── fhir.py
│   ├── hl7.py
│   ├── dicom.py
│   ├── iomt.py
│   └── icu.py
├── schemas/
├── services/
│   ├── normalize.py
│   └── store.py
├── alembic/
├── tests/
├── Dockerfile
└── requirements.txt
```

## Run locally

```bash
cd services/data-store
python -m venv .venv
source .venv/bin/activate                  # Windows: .venv\Scripts\activate
pip install -r requirements-dev.txt
cp .env.example .env
alembic upgrade head
uvicorn main:app --reload --port 8010
```

Do not use `Base.metadata.create_all()` in deployed environments. Run `alembic upgrade
head` as a Railway release command before switching application traffic.

## APIs

Writes require `ingestion:writer` (IoMT also accepts `device_gateway`):

| Method | Endpoint |
|---|---|
| POST | `/store/fhir` |
| POST | `/store/hl7` |
| POST | `/store/dicom` |
| POST | `/store/iomt` |
| POST | `/store/icu` |

The body is the normalized clinical envelope produced by the ingestion service. Tenant
identity is deliberately excluded from the schema and is taken from the verified JWT.
Replays return `duplicate: true` rather than creating a second clinical record.

Dashboard routes are:

```text
GET /v1/dashboard/{source}/summary
GET /v1/dashboard/fhir/patients
GET /v1/dashboard/hl7/events
GET /v1/dashboard/dicom/studies
GET /v1/dashboard/iomt/telemetry
GET /v1/dashboard/icu/vitals
```

All queries include `tenant_id` from the access token. `X-Tenant-ID` is only a
consistency check and cannot override the token tenant.

## Adding a data type

1. Add a source projection in `models/` using `ClinicalRecordMixin`.
2. Add source extraction in `Normalizer._source_fields`, `_source_id`, and
   `_patient_identifier`.
3. Add Pydantic dashboard schemas and a query in `StoreService`.
4. Add a router with separate writer/reader role dependencies.
5. Import the model in `models/__init__.py`.
6. Generate and review an Alembic revision; test upgrade and downgrade on a copy of
   production-like data.
7. Add normalization, tenant isolation, duplicate replay, and pagination tests.

## Extending normalization

Keep the canonical envelope stable and version the source payload through
`payload_schema`. Treat missing optional values as `None`; reject missing security
identities such as IoMT `device_id`. Never derive a dashboard field from direct
identifiers unless it is tokenized first. When mapping changes meaning, publish a new
schema version and perform an explicit backfill instead of silently rewriting history.

## Query optimization

- Composite indexes begin with `tenant_id` to match every dashboard predicate.
- Keep time windows bounded and pagination limits below 500.
- Use `EXPLAIN (ANALYZE, BUFFERS)` with production-like tenant cardinality.
- For large installations, partition source tables monthly by `observed_at`.
- Move hourly summaries to incrementally refreshed materialized views when source
  volume exceeds interactive aggregation targets.
- Use PgBouncer transaction pooling and size SQLAlchemy pools below the database
  connection limit.
- Add PostgreSQL row-level security as defense in depth when each transaction sets a
  verified `app.current_tenant`; do not enable an RLS policy without that transaction hook.

## Operations

`/healthz` verifies the process, `/readyz` verifies PostgreSQL, and `/metrics` exposes
Prometheus counters and latency histograms. Production OpenAPI docs are disabled.
Backups, retention, legal holds, deletion workflows, and audit-event forwarding remain
deployment controls and must be validated against the organization’s HIPAA/GDPR policy.
