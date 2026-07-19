"use client";

import { useQuery } from "@tanstack/react-query";
import { Activity, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { governanceApi } from "@/lib/api/governance-modules";
import { PageHeader } from "@/components/dashboard/page-header";
import { MetricCard } from "@/components/dashboard/metric-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ComplianceEventsPage() {
  const query = useQuery({ queryKey: ["compliance-events"], queryFn: governanceApi.complianceEvents, refetchInterval: 10_000 });
  const items = query.data?.items ?? [];
  return <>
    <PageHeader eyebrow="Continuous controls" title="Compliance events" description="Live evidence observations, mappings, drift, and control-effectiveness changes." />
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <MetricCard label="Recent events" value={String(items.length)} icon={Activity} />
      <MetricCard label="Effective" value={String(items.filter((item) => item.status === "effective").length)} icon={CheckCircle2} />
      <MetricCard label="Partial" value={String(items.filter((item) => item.status === "partial").length)} icon={Clock} />
      <MetricCard label="Ineffective" value={String(items.filter((item) => item.status === "ineffective").length)} icon={AlertTriangle} />
    </div>
    <Card className="mt-4"><CardHeader><CardTitle>Evidence stream</CardTitle><Badge>10s refresh</Badge></CardHeader><CardContent>
      <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-xs"><thead><tr className="border-y border-border text-foreground/45"><th className="py-3">Framework</th><th>Control</th><th>Event</th><th>Source</th><th>Status</th><th>Observed</th></tr></thead>
      <tbody>{items.map((item) => <tr key={item.event_id} className="border-b border-border/60"><td className="py-3 font-semibold">{item.framework}</td><td className="font-mono">{item.control_id}</td><td>{item.event_type}</td><td>{item.source}</td><td><Badge>{item.status}</Badge></td><td>{new Date(item.observed_at).toLocaleString()}</td></tr>)}</tbody></table></div>
    </CardContent></Card>
  </>;
}
