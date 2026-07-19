# Healthcare Data Ingestion & Streaming

## 1. Microservice architecture

```text
 Synthea JSON       HAPI FHIR R4       HL7 v2 / MLLP       DICOM Part 10
     |                   |                   |                  |
 SyntheaIngester    FhirStreamer       Hl7Ingester       DicomIngester
     |                   |                   |          metadata-only + quarantine
     +-------------------+-------------------+------------------+
                                     |
 MQTT / CoAP IoMT ------------> Canonical Normalizer <---------- MIMIC-IV CSV.GZ
 simulator / gateway            tenant + classification           chunked pandas
                                     |
                      PostgreSQL idempotency ledger
                         forced tenant row-level security
                                     |
                         Source-aware Event Router
                                     |
                  Kafka mTLS / idempotent producer / tenant key
      +------------------+-------------------+-------------------+
      |                  |                   |                   |
 Clinical services   PHI/audit services  IoMT security hub  ICU/analytics
      |                  |                   |                   |
 Next.js dashboards <-------- normalized APIs and read models -------->
```

The FastAPI edge accepts push data while the orchestrator concurrently runs pull/file pipelines.
All pipelines can also run independently. Direct identifiers are tokenized before routing metadata;
payloads remain classified and must stay inside the approved PHI trust boundary.

## 2. Folder structure

```text
data-ingestion/
|-- app/
|   |-- models/                    # canonical envelope and API requests
|   |-- pipelines/
|   |   |-- synthea_ingest.py
|   |   |-- fhir_stream.py
|   |   |-- hl7_ingest.py
|   |   |-- dicom_ingest.py
|   |   |-- iomt_simulator.py
|   |   `-- mimic_ingest.py
|   |-- routers/                   # source API endpoints
|   |-- services/
|   |   |-- normalization.py
|   |   |-- routing.py
|   |   |-- ledger.py
|   |   |-- retry.py
|   |   `-- ingestion_orchestrator.py
|   |-- auth.py
|   |-- config.py
|   `-- main.py
|-- docs/
|-- sql/001_ingestion.sql
|-- tests/
|-- *_ingest.py                    # requested compatibility entry points
|-- ingestion_orchestrator.py      # concurrent CLI
|-- Dockerfile
|-- railway.toml
|-- pyproject.toml
`-- .env.example
```

## 3. Source scripts

- `synthea_ingest.py`: reads Synthea FHIR JSON bundles, marks them `SYNTHETIC`, and routes each resource.
- `fhir_stream.py`: streams paginated HAPI FHIR search bundles. Pagination may not change origin.
- `hl7_ingest.py`: validates with `hl7apy` and emits minimum necessary message metadata.
- `dicom_ingest.py`: parses an allowlist with `stop_before_pixels=True`; raw objects enter quarantine.
- `iomt_simulator.py`: produces signed MQTT/CoAP-shaped telemetry for safe non-clinical testing.
- `mimic_ingest.py`: reads allowlisted MIMIC-IV tables in bounded pandas chunks and marks data de-identified.

MIMIC-IV access is governed by PhysioNet credentialing and its data-use agreement. This service never
downloads MIMIC automatically and must not bypass those terms.

## 4. Unified orchestrator

```bash
python ingestion_orchestrator.py \
  --tenant hospital-a \
  --pipelines synthea fhir iomt
```

The orchestrator uses `asyncio.create_task` and `gather` so sources progress independently. HL7 and DICOM
are push-driven by default. Failed pipeline names and exception classes are recorded without PHI.

## 5. FastAPI service

Required endpoints:

| Method | Endpoint | Input |
|---|---|---|
| POST | `/fhir/ingest` | FHIR Bundle or configured HAPI resource type |
| POST | `/hl7/ingest` | HL7 v2 ER7 |
| POST | `/dicom/ingest` | multipart DICOM object |
| POST | `/iomt/telemetry` | signed device telemetry envelope |
| POST | `/icu/ingest` | allowlisted MIMIC tables |

Additional endpoints are `/synthea/ingest`, `/orchestrator/runs`, `/healthz`, and `/metrics`.
Every ingestion request requires a signed JWT, tenant claim, allowed role, and matching tenant context.

## 6. Data normalization layer

Every source becomes `ClinicalEnvelope`:

```json
{
  "event_id": "uuid",
  "schema_version": "1.0",
  "tenant_id": "hospital-a",
  "source": "fhir",
  "source_id": "Observation/obs-1",
  "event_type": "fhir.observation",
  "classification": "PHI",
  "patient_token": "pt_hmac...",
  "observed_at": "2026-01-01T00:00:00Z",
  "payload_schema": "hl7.fhir.r4.Observation",
  "payload": {},
  "provenance": {},
  "integrity_sha256": "sha256",
  "trace_id": "trace"
}
```

HMAC namespaces prevent identifier joining across source types. The SHA-256 digest detects payload
changes; it is not a replacement for signatures or storage encryption.

## 7. Routing layer

| Source | Kafka topic | Primary consumers |
|---|---|---|
| FHIR | `clinical.fhir.normalized.v1` | interoperability, PHI, dashboards |
| Synthea | `clinical.synthetic.normalized.v1` | development and tests |
| HL7 v2 | `clinical.hl7v2.normalized.v1` | interoperability and audit |
| DICOM | `clinical.dicom.metadata.v1` | imaging security and audit |
| IoMT | `clinical.iomt.telemetry.v1` | IoMT hub and monitoring |
| MIMIC | `clinical.icu.deidentified.v1` | approved analytics/ML |

Kafka uses acknowledgements, idempotence, compression, mTLS configuration and a tenant/patient/device key
for ordered processing. PostgreSQL prevents already-routed duplicates from being published again.

## 8. Logging, errors and retry

Structured JSON logs contain request IDs, event IDs, tenant IDs, source, topic and error class—but never
payloads, raw identifiers, tokens, HL7 text or DICOM tags. Transient I/O failures use bounded exponential
backoff with cryptographic jitter. Invalid source data returns 4xx; unexpected errors are redacted.

The DICOM quarantine must use a Railway volume encrypted by the infrastructure provider or, preferably,
an external object store with customer-managed encryption, retention and malware scanning.

## 9. Developer and Railway deployment

Local setup:

```bash
cp .env.example .env
python -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
psql "$DATABASE_URL" -f sql/001_ingestion.sql
uvicorn app.main:app --reload
pytest -q
```

Railway:

1. Create a Railway project, PostgreSQL service and ingestion service rooted at this directory.
2. Apply `sql/001_ingestion.sql` with a migration job using a separate database-owner credential.
3. Set `DATABASE_URL` from Railway PostgreSQL and configure an external managed Kafka endpoint.
4. Store JWT, HAPI token, Kafka certificate and tokenization secrets only as Railway secrets.
5. Attach a persistent encrypted volume at `/data` only if DICOM quarantine is enabled.
6. Set `DICOM_QUARANTINE_DIR=/data/dicom-quarantine` and approved dataset paths.
7. Deploy; Railway uses `railway.toml` and checks `/healthz`.
8. Restrict the public endpoint through the HealthGov gateway, private networking or an authenticated
   Railway domain. Do not expose direct PHI ingestion without the gateway and WAF.

The frontend consumes backend read models, not Kafka or raw ingestion events. Add dashboards through
tenant-scoped APIs and never place PHI in browser telemetry, URLs, cache keys or chart labels.

## Automated CI/CD

The repository workflow `.github/workflows/ingestion.yml` runs all six adapters with generated fixtures
on push, schedule and manual dispatch. Optional live ingestion is restricted to a hardened self-hosted
runner; Railway deployment runs after validation. See [docs/CI-CD.md](docs/CI-CD.md) for secrets,
schedules, runner controls and adding pipelines.
