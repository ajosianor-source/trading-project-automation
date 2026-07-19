# Dashboard ingestion integration

The dashboard integration lives in `lib/api`, `hooks`, and `dashboards`. It connects the
Next.js portal to the FastAPI ingestion service through `NEXT_PUBLIC_API_URL`.

## Architecture

```text
Browser dashboard
  └─ React Query hooks (3–15 second bounded polling)
      └─ Axios client (JWT, tenant, purpose, request ID)
          └─ Railway FastAPI / dashboard read model
              ├─ PostgreSQL tenant-scoped projections
              └─ ingestion write endpoints → normalization/router → Kafka
```

The browser must not connect directly to Kafka, PostgreSQL, MQTT, or DICOM storage. The
dashboard uses small, tenant-scoped projections so PHI controls, rate limits, and audit
logging remain enforceable at the API boundary.

## Configuration

Create `portal/.env.local`:

```dotenv
NEXT_PUBLIC_API_URL=https://your-ingestion-service.up.railway.app
```

For same-origin deployments, omit the variable and proxy `/api` to FastAPI at the edge.
Only the API origin is public; credentials and service secrets must remain server-side.

The ingestion service already exposes these commands:

| Method | Path | Purpose |
|---|---|---|
| POST | `/fhir/ingest` | Ingest a FHIR bundle or stream request |
| POST | `/hl7/ingest` | Ingest an HL7 v2 message |
| POST | `/dicom/ingest` | Upload a DICOM object |
| POST | `/iomt/telemetry` | Publish normalized device telemetry |
| POST | `/icu/ingest` | Start ICU/MIMIC table ingestion |

The dashboards require the following read-model contract:

| Method | Path | Result |
|---|---|---|
| GET | `/v1/dashboard/{source}/summary` | `SourceSummary` |
| GET | `/v1/dashboard/fhir/patients` | `Page<FhirPatient>` |
| GET | `/v1/dashboard/hl7/events` | `Page<Hl7Event>` |
| GET | `/v1/dashboard/dicom/studies` | `Page<DicomStudy>` |
| GET | `/v1/dashboard/iomt/telemetry` | `Page<IomtReading>` |
| GET | `/v1/dashboard/icu/vitals` | `Page<IcuVital>` |

Implement these GET routes as tenant-filtered projections in the backend before enabling
production traffic. Every query must derive tenant identity from the verified access token,
not trust `X-Tenant-ID` alone. Return tokens or de-identified values instead of direct
identifiers, apply row-level security, and emit a PHI access audit event.

## Adding an ingestion endpoint

1. Add its runtime types to `types/ingestion.ts`.
2. Add a focused API module in `lib/api`. Use the shared `api` client and `unwrap`.
3. Add a React Query hook in `hooks`. Use a stable query key and a polling interval
   appropriate for the clinical use case.
4. Build the view in `dashboards/<source>` and add a thin App Router page.
5. Add the route to `components/layout/app-shell.tsx`.
6. Add backend contract tests for tenant isolation, authorization, redaction, and pagination.

Mutations should invalidate only their source key:

```ts
await queryClient.invalidateQueries({ queryKey: ["ingestion", "source"] });
```

## Reliability and security

- The client adds `Authorization`, `X-Tenant-ID`, `X-Purpose-Of-Use`, and `X-Request-ID`.
- Access tokens remain in memory; refresh tokens belong in `HttpOnly`, `Secure`,
  `SameSite` cookies.
- React Query keeps prior pages during filters and exposes explicit loading/error states.
- Polling pauses with browser lifecycle behavior and avoids long-lived proxy connections.
- DICOM views expose metadata only. Pixel data and original identifiers stay out of the UI.
- Production CORS must allow only the deployed Vercel portal origin.

If the API later supports SSE or WebSocket subscriptions, keep the snapshot queries as the
recovery path and invalidate React Query keys when an event notification arrives.
