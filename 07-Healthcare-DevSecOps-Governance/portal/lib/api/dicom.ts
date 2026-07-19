import { api, unwrap } from "./client";
import type { DicomStudy, Page, SourceSummary } from "@/types/ingestion";

export const dicomApi = {
  summary: () => unwrap<SourceSummary>(api.get("/data-store/v1/dashboard/dicom/summary")),
  studies: (search = "") =>
    unwrap<Page<DicomStudy>>(api.get("/data-store/v1/dashboard/dicom/studies", { params: { search, limit: 50 } })),
  ingest: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return unwrap<{ accepted: number; rejected: number }>(
      api.post("/ingestion/dicom/ingest", form, { headers: { "Content-Type": "multipart/form-data" } }),
    );
  },
};
