"use client";

import { useQuery } from "@tanstack/react-query";
import { ShieldAlert, Target, TriangleAlert } from "lucide-react";

import { MetricCard } from "@/components/dashboard/metric-card";
import { PageHeader } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { stakeholderApi } from "@/lib/api/stakeholders";

export default function RiskPage() {
  const risks = useQuery({ queryKey: ["stakeholders", "risks"], queryFn: stakeholderApi.risks, refetchInterval: 15_000 });
  const rows = risks.data?.items ?? [];
  return <div><PageHeader eyebrow="Enterprise risk" title="Clinical risk scoring" description="PHI, IoMT, FHIR, AI/ML, compliance, and likelihood × impact analysis." /><div className="grid gap-4 sm:grid-cols-3"><MetricCard label="Tracked risks" value={String(risks.data?.total ?? 0)} change="live" icon={TriangleAlert} detail="all domains" /><MetricCard label="High residual" value={String(rows.filter((risk) => risk.residual_score >= 50).length)} change="review" trend="down" icon={ShieldAlert} detail="acceptance required" /><MetricCard label="Treatment coverage" value="—" change="evidence" icon={Target} detail="awaiting history" /></div><Card className="mt-4"><CardHeader><CardTitle>Executive risk heatmap</CardTitle><Badge>Likelihood × impact</Badge></CardHeader><CardContent>{risks.isLoading ? <Skeleton className="h-72" /> : <div className="grid grid-cols-5 gap-2">{Array.from({ length: 25 }, (_, index) => { const likelihood = index % 5 + 1; const impact = 5 - Math.floor(index / 5); const count = rows.filter((risk) => risk.likelihood === likelihood && risk.impact === impact).length; return <div title={`Likelihood ${likelihood}, impact ${impact}: ${count} risks`} key={index} className={`grid aspect-square place-items-center rounded-lg text-xs font-semibold ${likelihood * impact >= 15 ? "bg-danger/70 text-white" : likelihood * impact >= 8 ? "bg-amber-500/60" : "bg-emerald-500/35"}`}>{count}</div>; })}</div>}</CardContent></Card></div>;
}
