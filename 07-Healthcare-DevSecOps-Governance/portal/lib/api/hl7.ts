import { api, unwrap } from "./client";
import type { Hl7Event, Page, SourceSummary } from "@/types/ingestion";

export const hl7Api = {
  summary: () => unwrap<SourceSummary>(api.get("/data-store/v1/dashboard/hl7/summary")),
  events: (search = "") =>
    unwrap<Page<Hl7Event>>(api.get("/data-store/v1/dashboard/hl7/events", { params: { search, limit: 100 } })),
  ingest: (tenantId: string, message: string) =>
    unwrap<{ accepted: number; rejected: number }>(
      api.post("/ingestion/hl7/ingest", { tenant_id: tenantId, message }),
    ),
};
