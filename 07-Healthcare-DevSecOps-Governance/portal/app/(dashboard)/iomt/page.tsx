"use client";

import { Cpu, Radio, ShieldCheck, WifiOff } from "lucide-react";
import { useState } from "react";

import { MetricCard } from "@/components/dashboard/metric-card";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FilterBar } from "@/components/dashboard/filter-bar";
import { useIoMT } from "@/hooks/useIoMT";

export default function IomtPage() {
  const [query, setQuery] = useState("");
  const { summary, telemetry, realtime } = useIoMT(query);
  const rows = telemetry.data?.items ?? [];
  const quarantined = rows.filter((item) => item.trustStatus === "quarantined").length;
  const trusted = rows.filter((item) => item.trustStatus === "trusted").length;
  return <>
    <PageHeader eyebrow="Connected care" title="IoMT fleet security" description="Live device identity, attestation, firmware, and network trust posture." />
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <MetricCard label="Visible devices" value={String(new Set(rows.map((item) => item.deviceId)).size)} change="live" icon={Cpu} detail="tenant scoped" />
      <MetricCard label="Trusted readings" value={String(trusted)} change="current" icon={ShieldCheck} detail="attested" />
      <MetricCard label="Events / minute" value={String(summary.data?.eventsPerMinute ?? 0)} change={realtime.transport} icon={Radio} detail="normalized telemetry" />
      <MetricCard label="Quarantined" value={String(quarantined)} change="live" trend="down" icon={WifiOff} detail="requires review" />
    </div>
    <Card className="mt-4"><CardHeader><div><CardTitle>Device telemetry inventory</CardTitle><p className="mt-1 text-xs text-foreground/40">Live normalized events; no fabricated fleet totals</p></div><Badge>{summary.data?.status ?? "offline"}</Badge></CardHeader><CardContent><FilterBar onSearch={setQuery} placeholder="Filter by device identity…" /><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[720px] text-left text-xs"><thead className="border-y border-border text-[10px] uppercase tracking-wider text-foreground/40"><tr><th className="py-3">Device</th><th>Observed</th><th>Sequence</th><th>Measurements</th><th>Trust</th></tr></thead><tbody>{rows.map((reading) => <tr key={reading.eventId} className="border-b border-border/60"><td className="py-4 font-mono">{reading.deviceId}</td><td>{new Date(reading.observedAt).toLocaleString()}</td><td>{reading.sequence}</td><td className="max-w-72 truncate font-mono">{JSON.stringify(reading.measurements)}</td><td><Badge>{reading.trustStatus}</Badge></td></tr>)}</tbody></table>{rows.length === 0 && <p className="py-10 text-center text-sm text-foreground/45">Waiting for governed IoMT telemetry.</p>}</div></CardContent></Card>
  </>;
}
