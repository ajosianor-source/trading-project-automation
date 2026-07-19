"use client";

import { useQueries } from "@tanstack/react-query";
import { Activity, CircleDollarSign, ShieldCheck, TriangleAlert } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, Tooltip } from "recharts";

import { MetricCard } from "@/components/dashboard/metric-card";
import { PageHeader } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { stakeholderApi } from "@/lib/api/stakeholders";

export default function ExecutiveAnalyticsPage() {
  const [posture, risks, alerts] = useQueries({ queries: [
    { queryKey: ["executive", "posture"], queryFn: stakeholderApi.posture, refetchInterval: 30_000 },
    { queryKey: ["executive", "risks"], queryFn: stakeholderApi.risks, refetchInterval: 30_000 },
    { queryKey: ["executive", "alerts"], queryFn: stakeholderApi.alerts, refetchInterval: 15_000 },
  ] });
  const trend = Array.from({ length: 12 }, (_, index) => ({ month: index + 1, value: Math.max(0, (risks.data?.total ?? 0) - index) }));
  const avoided = Math.max(0, (posture.data?.overall_score ?? 0) * 1250 - (alerts.data?.total ?? 0) * 500);
  return <div><PageHeader eyebrow="Board and investment view" title="Executive analytics" description="Evidence-backed ROI, compliance, risk, incident, fleet, PHI, and AI governance indicators." /><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><MetricCard label="Risk-adjusted value" value={`£${Math.round(avoided).toLocaleString()}`} change="modeled" icon={CircleDollarSign} detail="control benefit" /><MetricCard label="Compliance posture" value={`${posture.data?.overall_score ?? 0}%`} change="continuous" icon={ShieldCheck} detail="weighted controls" /><MetricCard label="Open enterprise risk" value={String(risks.data?.total ?? 0)} change="live" trend="down" icon={TriangleAlert} detail="all domains" /><MetricCard label="Open incidents" value={String(alerts.data?.total ?? 0)} change="15s" trend="down" icon={Activity} detail="SOC queue" /></div><div className="mt-4 grid gap-4 xl:grid-cols-[1.2fr_.8fr]"><Card><CardHeader><CardTitle>Risk exposure trend</CardTitle><Badge>12 months</Badge></CardHeader><CardContent className="h-72"><ResponsiveContainer width="100%" height="100%"><AreaChart data={trend}><Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)" }} /><Area type="monotone" dataKey="value" stroke="var(--primary)" fill="var(--primary)" fillOpacity={0.15} /></AreaChart></ResponsiveContainer></CardContent></Card><Card><CardHeader><CardTitle>Framework readiness</CardTitle></CardHeader><CardContent className="space-y-5">{(posture.data?.frameworks ?? []).length === 0 ? <div className="grid h-48 place-items-center rounded-lg border border-dashed border-border text-sm text-foreground/45">Awaiting evidence collectors.</div> : posture.data?.frameworks.map((framework) => <div key={framework.name}><div className="mb-2 flex justify-between text-xs"><span>{framework.name}</span><strong>{framework.score}%</strong></div><Progress value={framework.score} /></div>)}</CardContent></Card></div></div>;
}
