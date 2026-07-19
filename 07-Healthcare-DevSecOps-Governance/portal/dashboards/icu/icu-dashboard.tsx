"use client";

import { Search } from "lucide-react";
import { useState } from "react";
import { Line, LineChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { PageHeader } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { EmptyState, QueryError, SourceMetrics, SourceStatus } from "@/dashboards/source-ui";
import { useICU } from "@/hooks/useICU";

export function IcuDashboard() {
  const [patientId, setPatientId] = useState("");
  const { summary, vitals, error } = useICU(patientId);
  const items = vitals.data?.items ?? [];
  const chart = [...items].reverse().map((vital) => ({ ...vital, time: new Date(vital.observedAt).toLocaleTimeString() }));
  return <div><PageHeader eyebrow="Clinical data / ICU" title="ICU vitals" description="De-identified MIMIC and clinical observation streams for operational monitoring." actions={<SourceStatus status={summary.data?.status} />} /><QueryError error={error} /><SourceMetrics summary={summary.data} /><div className="mt-4 grid gap-4 xl:grid-cols-[1.2fr_.8fr]"><Card><CardHeader><CardTitle>Vitals timeline</CardTitle><Badge>5s refresh</Badge></CardHeader><CardContent className="h-80">{chart.length === 0 ? <EmptyState label="No ICU vital observations are available." /> : <ResponsiveContainer width="100%" height="100%"><LineChart data={chart}><CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false}/><XAxis dataKey="time" tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 10 }} /><Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10 }}/><Legend/><Line dataKey="heartRate" name="Heart rate" stroke="#5b8def" dot={false}/><Line dataKey="spo2" name="SpO₂" stroke="#24b47e" dot={false}/><Line dataKey="systolicBp" name="Systolic BP" stroke="#f59e0b" dot={false}/><Line dataKey="respiratoryRate" name="Resp. rate" stroke="#a855f7" dot={false}/></LineChart></ResponsiveContainer>}</CardContent></Card><Card><CardHeader><CardTitle>Latest observations</CardTitle><Badge>{vitals.data?.total ?? 0} readings</Badge></CardHeader><CardContent><label className="relative block"><Search className="absolute left-3 top-2.5 size-4 text-foreground/35" /><Input className="pl-9" value={patientId} onChange={(event) => setPatientId(event.target.value)} placeholder="Filter patient token" aria-label="Filter by patient token" /></label><div className="mt-3 max-h-72 space-y-2 overflow-auto">{items.length === 0 ? <EmptyState label="No observations match this token." /> : items.map((vital) => <div key={vital.eventId} className="rounded-lg border border-border p-3 text-xs"><div className="flex justify-between"><span className="font-mono">{vital.patientToken}</span><span className="text-foreground/40">{new Date(vital.observedAt).toLocaleTimeString()}</span></div><p className="mt-2 font-semibold">HR {vital.heartRate ?? "—"} · SpO₂ {vital.spo2 ?? "—"} · BP {vital.systolicBp ?? "—"} · RR {vital.respiratoryRate ?? "—"}</p><p className="mt-1 text-[10px] text-foreground/35">stay {vital.stayToken}</p></div>)}</div></CardContent></Card></div></div>;
}
