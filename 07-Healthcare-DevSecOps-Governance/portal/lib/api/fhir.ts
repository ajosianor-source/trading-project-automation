import { api, unwrap } from "./client";
import type { FhirPatient, Page, SourceSummary } from "@/types/ingestion";

export const fhirApi = {
  summary: () => unwrap<SourceSummary>(api.get("/data-store/v1/dashboard/fhir/summary")),
  patients: (search = "") =>
    unwrap<Page<FhirPatient>>(api.get("/data-store/v1/dashboard/fhir/patients", { params: { search, limit: 50 } })),
  ingestBundle: (tenantId: string, bundle: object) =>
    unwrap<{ accepted: number; rejected: number }>(
      api.post("/ingestion/fhir/ingest", { tenant_id: tenantId, bundle }),
    ),
  streamResource: (tenantId: string, resourceType: string) =>
    unwrap<{ accepted: number; rejected: number }>(
      api.post("/ingestion/fhir/ingest", { tenant_id: tenantId, resource_type: resourceType }),
    ),
};
