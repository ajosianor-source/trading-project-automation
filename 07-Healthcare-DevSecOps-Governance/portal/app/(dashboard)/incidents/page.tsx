"use client";

import { useQuery } from "@tanstack/react-query";
import { BellRing, Clock3, Search, ShieldAlert } from "lucide-react";

import { PageHeader } from "@/components/dashboard/page-header";
import { MetricCard } from "@/components/dashboard/metric-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { stakeholderApi } from "@/lib/api/stakeholders";

export default function IncidentsPage() {
  const alerts = useQuery({ queryKey: ["stakeholders", "alerts"], queryFn: stakeholderApi.alerts, refetchInterval: 5_000 });
  const rows = alerts.data?.items ?? [];
  return <div><PageHeader eyebrow="SOC operations" title="Incident response" description="Real-time alerts, escalation workflows, ticketing, playbooks, and forensic capture." actions={<Button><BellRing className="size-4" />Create incident</Button>} /><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><MetricCard label="Open alerts" value={String(alerts.data?.total ?? 0)} change="live" icon={ShieldAlert} detail="all sources" /><MetricCard label="Critical" value={String(rows.filter((item) => item.severity === "critical").length)} change="P1" trend="down" icon={BellRing} detail="requires action" /><MetricCard label="Mean acknowledge" value="—" change="SLO" icon={Clock3} detail="awaiting history" /><MetricCard label="Active searches" value="0" change="ready" icon={Search} detail="forensics jobs" /></div><Card className="mt-4"><CardHeader><CardTitle>Escalation queue</CardTitle><Badge>5s refresh</Badge></CardHeader><CardContent>{alerts.isLoading ? <Skeleton className="h-52" /> : rows.length === 0 ? <div className="grid h-52 place-items-center rounded-lg border border-dashed border-border text-sm text-foreground/45">No open alerts for this tenant.</div> : <table className="w-full text-left text-xs"><thead><tr><th>Severity</th><th>Title</th><th>Source</th><th>Status</th></tr></thead><tbody>{rows.map((alert) => <tr className="border-t border-border" key={alert.alert_id}><td className="py-3"><Badge>{alert.severity}</Badge></td><td>{alert.title}</td><td>{alert.source}</td><td>{alert.status}</td></tr>)}</tbody></table>}</CardContent></Card></div>;
}
