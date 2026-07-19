import { api, unwrap } from "./client";

export interface FrameworkDashboard {
  framework: string;
  version: string;
  score: number;
  control_count: number;
  evidence_freshness: number;
  open_drift: number;
  status: string;
  domains: { name: string; controls: number }[];
}

export interface ComplianceEvent {
  event_id: string;
  framework: string;
  control_id: string;
  event_type: string;
  source: string;
  status: string;
  observed_at: string;
}

export interface IomtDevice {
  device_id: string;
  device_type: string;
  manufacturer: string;
  model: string;
  site: string;
  firmware_version: string;
  trust_state: string;
  risk_score: number;
  last_seen_at?: string;
}

export interface IomtDeviceProfile {
  device_type: "heart_monitor" | "ventilator" | "wearable" | "imaging";
  required_metrics: string[];
  ranges: Record<string, [number, number]>;
  criticality: number;
}

export const governanceApi = {
  frameworkDashboard: (framework: "dsp" | "iso27001" | "soc2") =>
    unwrap<FrameworkDashboard>(api.get(`/${framework}/v1/dashboard`)),
  complianceEvents: () =>
    unwrap<{ items: ComplianceEvent[]; total: number }>(
      api.get("/compliance-events/v1/events"),
    ),
  generateSynthetic: (count: number) =>
    unwrap<{ dataset_id: string; status: string; expires_at: string }>(
      api.post("/synthetic/v1/generate/all", { count }),
    ),
  iomtPosture: () =>
    unwrap<{ total: number; trusted: number; quarantined: number; average_risk: number }>(
      api.get("/iomt-security/v1/posture"),
    ),
  iomtDevices: () =>
    unwrap<{ items: IomtDevice[]; total: number }>(
      api.get("/iomt-security/v1/devices"),
    ),
  iomtProfiles: () =>
    unwrap<{ items: IomtDeviceProfile[] }>(
      api.get("/iomt-security/v1/device-profiles"),
    ),
};
