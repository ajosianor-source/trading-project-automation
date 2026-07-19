"use client";

import { motion } from "framer-motion";
import { Radio, Search } from "lucide-react";
import { useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { InteractiveGrid } from "@/components/dashboard/interactive-grid";
import { PageHeader } from "@/components/dashboard/page-header";
import { ConnectionBadge } from "@/components/realtime/connection-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { EmptyState, QueryError, SourceMetrics, SourceStatus } from "@/dashboards/source-ui";
import { useIoMT } from "@/hooks/useIoMT";

export function IomtIngestionDashboard() {
  const [deviceId, setDeviceId] = useState("");
  const { summary, telemetry, error, realtime } = useIoMT(deviceId);
  const items = telemetry.data?.items ?? [];
  const chart = [...items].reverse().map((item) => ({
    time: new Date(item.observedAt).toLocaleTimeString(),
    value: Object.values(item.measurements).find((value) => typeof value === "number"),
  }));
  const devices = Array.from(new Set(items.map((item) => item.deviceId))).map((id) => {
    const reading = items.find((item) => item.deviceId === id);
    return { id, status: reading?.trustStatus ?? "review" };
  });

  const liveChart = <Card><CardHeader><div><CardTitle>Live measurement</CardTitle><p className="mt-1 flex items-center gap-1 text-xs text-foreground/45"><Radio className="size-3 text-emerald-500" />One-second updates with smooth interpolation</p></div></CardHeader><CardContent className="h-72">{chart.length === 0 ? <EmptyState label="Waiting for trusted device telemetry." /> : <ResponsiveContainer width="100%" height="100%"><LineChart data={chart}><CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} /><XAxis dataKey="time" tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 10 }} /><Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10 }} /><Line isAnimationActive animationDuration={450} type="monotone" dataKey="value" stroke="var(--primary)" strokeWidth={2} dot={false} /></LineChart></ResponsiveContainer>}</CardContent></Card>;
  const stream = <Card><CardHeader><CardTitle>Telemetry stream</CardTitle><Badge>{telemetry.data?.total ?? 0} events</Badge></CardHeader><CardContent><label className="relative block"><Search className="absolute left-3 top-2.5 size-4 text-foreground/35" /><Input className="pl-9" value={deviceId} onChange={(event) => setDeviceId(event.target.value)} placeholder="Filter by device identity" aria-label="Filter by device identity" /></label><div aria-live="polite" className="mt-3 max-h-72 space-y-2 overflow-auto">{items.length === 0 ? <EmptyState label="No telemetry events match this device." /> : items.map((event) => <motion.div layout initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} key={event.eventId} className="rounded-lg border border-border p-3 text-xs hover:border-primary/40"><div className="flex justify-between"><span className="font-mono font-semibold">{event.deviceId}</span><Badge>{event.trustStatus}</Badge></div><p className="mt-2 text-foreground/55">{Object.entries(event.measurements).map(([key, value]) => `${key}: ${value}`).join(" · ")}</p><p className="mt-1 text-[10px] text-foreground/35">{new Date(event.observedAt).toLocaleString()} · seq {event.sequence}</p></motion.div>)}</div></CardContent></Card>;
  const heatmap = <Card><CardHeader><div><CardTitle>Device risk heatmap</CardTitle><p className="mt-1 text-xs text-foreground/40">Color represents current zero-trust disposition</p></div></CardHeader><CardContent><div className="grid grid-cols-4 gap-2 sm:grid-cols-8 lg:grid-cols-12">{devices.length === 0 ? <div className="col-span-full"><EmptyState label="Waiting for device identities." /></div> : devices.map((device) => <motion.button whileHover={{ scale: 1.08 }} title={`${device.id}: ${device.status}`} key={device.id} onClick={() => setDeviceId(device.id)} className={`aspect-square rounded-md ${device.status === "trusted" ? "bg-emerald-500/75" : device.status === "quarantined" ? "bg-danger/80" : "bg-amber-500/75"}`} aria-label={`Filter ${device.id}`} />)}</div></CardContent></Card>;

  return <div><PageHeader eyebrow="Connected care / IoMT" title="Device telemetry" description="High-frequency, zero-trust telemetry with transport failover and interactive device analysis." actions={<><ConnectionBadge transport={realtime.transport} /><SourceStatus status={summary.data?.status} /></>} /><QueryError error={error} /><SourceMetrics summary={summary.data} /><div className="mt-4"><InteractiveGrid dashboard="iomt-live" widgets={[{ id: "telemetry-chart", title: "Live telemetry", content: liveChart, defaultSpan: 8 }, { id: "event-stream", title: "Event stream", content: stream, defaultSpan: 4 }, { id: "risk-heatmap", title: "Risk heatmap", content: heatmap, defaultSpan: 12 }]} /></div></div>;
}
