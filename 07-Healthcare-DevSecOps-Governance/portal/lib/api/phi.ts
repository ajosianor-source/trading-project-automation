import { api, unwrap } from "./client";
import type { Page, PhiAccessEvent, PhiAccessSummary } from "@/types/ingestion";

interface AuditEvent {
  occurred_at: string;
  actor_token: string;
  action: string;
  resource_token: string;
  purpose_of_use: string;
  outcome: "success" | "denied" | "error";
  trace_id: string;
}

async function auditEvents(): Promise<AuditEvent[]> {
  const response = await unwrap<{ items: AuditEvent[] }>(
    api.get("/audit/v1/events", { params: { domain: "phi", limit: 500 } }),
  );
  return response.items;
}

export const phiApi = {
  summary: async (): Promise<PhiAccessSummary> => {
    const items = await auditEvents();
    const today = new Date().toISOString().slice(0, 10);
    const todaysItems = items.filter((item) => item.occurred_at.startsWith(today));
    const hourly = Array.from({ length: 24 }, (_, hour) => {
      const matching = todaysItems.filter(
        (item) => new Date(item.occurred_at).getUTCHours() === hour,
      );
      return {
        hour: `${hour.toString().padStart(2, "0")}:00`,
        allowed: matching.filter((item) => item.outcome === "success").length,
        denied: matching.filter((item) => item.outcome === "denied").length,
      };
    });
    return {
      readsToday: todaysItems.filter((item) => item.action === "read").length,
      uniqueIdentities: new Set(todaysItems.map((item) => item.actor_token)).size,
      deniedRequests: todaysItems.filter((item) => item.outcome === "denied").length,
      breakGlassEvents: todaysItems.filter(
        (item) => item.purpose_of_use.toLowerCase() === "break-glass",
      ).length,
      hourly,
      classification: [
        { name: "PHI access", value: todaysItems.length },
        {
          name: "Denied",
          value: todaysItems.filter((item) => item.outcome === "denied").length,
        },
      ],
    };
  },
  events: async (search = "", decision = ""): Promise<Page<PhiAccessEvent>> => {
    const items = (await auditEvents())
      .map<PhiAccessEvent>((item) => ({
        id: item.trace_id,
        occurredAt: item.occurred_at,
        actorToken: item.actor_token,
        patientToken: item.resource_token,
        resource: item.action,
        purpose: item.purpose_of_use,
        decision: item.purpose_of_use.toLowerCase() === "break-glass"
          ? "break-glass"
          : item.outcome === "denied" ? "denied" : "allowed",
        riskScore: item.outcome === "denied" ? 80 : 20,
      }))
      .filter((item) => !search || JSON.stringify(item).toLowerCase().includes(search.toLowerCase()))
      .filter((item) => !decision || item.decision === decision)
      .slice(0, 100);
    return { items, total: items.length, nextCursor: null };
  },
};
