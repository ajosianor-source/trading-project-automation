import { api, unwrap } from "./client";
import type { IcuVital, Page, SourceSummary } from "@/types/ingestion";

export const icuApi = {
  summary: () => unwrap<SourceSummary>(api.get("/data-store/v1/dashboard/icu/summary")),
  vitals: (patientToken = "") =>
    unwrap<Page<IcuVital>>(
      api.get("/data-store/v1/dashboard/icu/vitals", { params: { patient_token: patientToken, limit: 200 } }),
    ),
  ingest: (tenantId: string, tables: string[]) =>
    unwrap<{ accepted: number; rejected: number }>(
      api.post("/ingestion/icu/ingest", { tenant_id: tenantId, tables }),
    ),
};
