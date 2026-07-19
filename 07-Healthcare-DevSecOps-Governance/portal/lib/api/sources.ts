import { api, unwrap } from "./client";

export interface EthicalSource {
  source_id: string;
  name: string;
  modalities: string[];
  access_tier: "SYNTHETIC" | "PUBLIC_DEIDENTIFIED" | "CONTROLLED_RESEARCH" | "LIVE_PHI";
  license: string;
  enabled: boolean;
  credential_required: boolean;
  dua_required: boolean;
  restrictions: string[];
}

export const sourceApi = {
  list: () => unwrap<{ items: EthicalSource[] }>(api.get("/ingestion/sources")),
};
