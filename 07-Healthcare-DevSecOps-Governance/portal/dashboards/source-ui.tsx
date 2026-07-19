"use client";

import { AlertTriangle, CheckCircle2, Clock3, Gauge, XCircle } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { MetricCard } from "@/components/dashboard/metric-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { SourceSummary } from "@/types/ingestion";

export function SourceMetrics({ summary }: { summary?: SourceSummary }) {
  if (!summary) return <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-36 rounded-xl" />)}</div>;
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <MetricCard label="Accepted events" value={summary.accepted24h.toLocaleString()} change={`${summary.eventsPerMinute.toFixed(1)}/min`} icon={CheckCircle2} detail="last 24 hours" />
      <MetricCard label="Rejected events" value={summary.rejected24h.toLocaleString()} change={summary.rejected24h ? "requires review" : "no exceptions"} trend="down" icon={XCircle} detail="last 24 hours" />
      <MetricCard label="Throughput" value={`${summary.eventsPerMinute.toFixed(1)}/m`} change={summary.status} icon={Gauge} detail="normalized events" />
      <MetricCard label="Last event" value={summary.lastEventAt ? new Date(summary.lastEventAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"} change={summary.status} icon={Clock3} detail="source health" />
    </div>
  );
}

export function ThroughputChart({ summary, title = "Ingestion throughput" }: { summary?: SourceSummary; title?: string }) {
  return (
    <Card>
      <CardHeader><div><CardTitle>{title}</CardTitle><p className="mt-1 text-xs text-foreground/45">Accepted and rejected normalized events</p></div></CardHeader>
      <CardContent className="h-72">
        {!summary ? <Skeleton className="h-full w-full" /> : summary.trend.length === 0 ? <EmptyState label="No throughput samples are available yet." /> : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={summary.trend}>
              <defs>
                <linearGradient id="acceptedFill" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="var(--primary)" stopOpacity={0.35}/><stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/></linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="time" tick={{ fontSize: 11 }} stroke="currentColor" opacity={0.45} />
              <YAxis tick={{ fontSize: 11 }} stroke="currentColor" opacity={0.45} />
              <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10 }} />
              <Area type="monotone" dataKey="accepted" stroke="var(--primary)" fill="url(#acceptedFill)" strokeWidth={2} />
              <Area type="monotone" dataKey="rejected" stroke="var(--danger)" fill="transparent" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

export function QueryError({ error }: { error: unknown }) {
  if (!error) return null;
  const message = error instanceof Error ? error.message : "The ingestion read model could not be reached.";
  return <div role="alert" className="mb-4 flex items-start gap-3 rounded-xl border border-danger/25 bg-danger/5 p-4 text-sm"><AlertTriangle className="mt-0.5 size-4 shrink-0 text-danger" /><div><p className="font-semibold">Live data unavailable</p><p className="mt-0.5 text-foreground/55">{message}</p></div></div>;
}

export function EmptyState({ label }: { label: string }) {
  return <div className="grid h-full min-h-28 place-items-center rounded-lg border border-dashed border-border text-sm text-foreground/45">{label}</div>;
}

export function SourceStatus({ status }: { status?: SourceSummary["status"] }) {
  const tone = status === "healthy" ? "bg-emerald-500" : status === "degraded" ? "bg-amber-500" : "bg-danger";
  return <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold"><span className={`size-2 rounded-full ${tone}`} />{status ?? "connecting"}</span>;
}
