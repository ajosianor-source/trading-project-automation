import { api, unwrap } from "./client";
import type { IomtReading, Page, SourceSummary } from "@/types/ingestion";

export const iomtApi = {
  summary: () => unwrap<SourceSummary>(api.get("/data-store/v1/dashboard/iomt/summary")),
  telemetry: (deviceId = "") =>
    unwrap<Page<IomtReading>>(
      api.get("/data-store/v1/dashboard/iomt/telemetry", { params: { device_id: deviceId, limit: 100 } }),
    ),
  ingest: (payload: object) =>
    unwrap<{ accepted: number; rejected: number }>(api.post("/ingestion/iomt/telemetry", payload)),
};
