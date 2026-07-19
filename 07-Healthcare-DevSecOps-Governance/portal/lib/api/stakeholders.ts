import { api, unwrap } from "./client";

export interface AlertItem {
  alert_id: string;
  severity: "critical" | "high" | "medium" | "low";
  title: string;
  source: string;
  status: string;
  created_at: string;
}

export interface AuditItem {
  audit_id: string;
  occurred_at: string;
  event_domain: string;
  action: string;
  actor_token: string;
  outcome: string;
  event_digest: string;
}

export interface RiskItem {
  risk_id: string;
  domain: string;
  asset_token: string;
  likelihood: number;
  impact: number;
  residual_score: number;
}

export interface MarketplaceConnector {
  vendor: string;
  standards: string[];
  status: string;
}

export const stakeholderApi = {
  posture: () =>
    unwrap<{
      overall_score: number;
      evidence_freshness: number;
      drift_count: number;
      frameworks: { name: string; score: number }[];
    }>(api.get("/compliance/v1/posture")),
  alerts: () => unwrap<{ items: AlertItem[]; total: number }>(api.get("/alerts/v1/alerts")),
  audit: (domain = "") =>
    unwrap<{ items: AuditItem[]; total: number; integrity: string }>(
      api.get("/audit/v1/events", { params: { domain, limit: 100 } }),
    ),
  risks: () =>
    unwrap<{ items: RiskItem[]; total: number; heatmap: unknown[] }>(
      api.get("/risk/v1/risks"),
    ),
  connectors: () =>
    unwrap<{ connectors: MarketplaceConnector[] }>(
      api.get("/marketplace/v1/connectors"),
    ),
};
