"use client";

import { useQueries, useQuery } from "@tanstack/react-query";
import { CheckCircle2, ClipboardCheck, FileCheck2, Scale } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { MetricCard } from "@/components/dashboard/metric-card";
import { PageHeader } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { Progress } from "@/components/ui/progress";
import { governanceApi } from "@/lib/api/governance-modules";
import { stakeholderApi } from "@/lib/api/stakeholders";

const embeddedFrameworks = [
  { key: "dsp" as const, href: "/dsp-toolkit", name: "NHS DSP Toolkit", version: "2025-26 v8" },
  { key: "iso27001" as const, href: "/iso27001", name: "ISO 27001", version: "2022 · Annex A" },
  { key: "soc2" as const, href: "/soc2", name: "SOC 2", version: "Trust Services Criteria" },
];

export default function CompliancePage() {
  const [reportOpen, setReportOpen] = useState(false);
  const posture = useQuery({
    queryKey: ["compliance", "posture"],
    queryFn: stakeholderApi.posture,
    refetchInterval: 30_000,
  });
  const frameworkQueries = useQueries({
    queries: embeddedFrameworks.map((framework) => ({
      queryKey: ["framework-dashboard", framework.key],
      queryFn: () => governanceApi.frameworkDashboard(framework.key),
      refetchInterval: 30_000,
    })),
  });
  const frameworkCount = posture.data?.frameworks.length ?? 0;
  return <>
    <PageHeader eyebrow="Compliance center" title="Continuous compliance" description="Live control effectiveness, evidence freshness, drift, and regulatory readiness." actions={<><Button variant="outline">Evidence vault</Button><Button onClick={() => setReportOpen(true)}>Generate audit pack</Button></>} />
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <MetricCard label="Overall posture" value={`${posture.data?.overall_score ?? 0}%`} change="live" icon={CheckCircle2} detail="weighted controls" />
      <MetricCard label="Evidence freshness" value={`${posture.data?.evidence_freshness ?? 0}%`} change="30s" icon={FileCheck2} detail="within SLA" />
      <MetricCard label="Compliance drift" value={String(posture.data?.drift_count ?? 0)} change="live" trend="down" icon={Scale} detail="requires remediation" />
      <MetricCard label="Frameworks reporting" value={String(frameworkCount)} change="API" icon={ClipboardCheck} detail="tenant scoped" />
    </div>
    <section className="mt-4" aria-labelledby="assurance-frameworks">
      <div className="mb-3 flex items-end justify-between"><div><h2 id="assurance-frameworks" className="text-sm font-semibold">Assurance frameworks</h2><p className="mt-1 text-xs text-foreground/45">Evidence-backed readiness from live compliance services</p></div><Badge>Live posture</Badge></div>
      <div className="grid gap-4 lg:grid-cols-3">
        {embeddedFrameworks.map((framework, index) => {
          const current = frameworkQueries[index].data;
          return <Link key={framework.key} href={framework.href} className="focus-ring rounded-xl"><Card className="h-full transition hover:-translate-y-0.5 hover:border-primary/40"><CardContent className="p-5"><div className="flex items-start justify-between"><div><h3 className="font-semibold">{framework.name}</h3><p className="mt-1 text-[11px] text-foreground/45">{framework.version}</p></div><Badge>{current?.status ?? "Loading"}</Badge></div><div className="mt-5 flex items-end justify-between"><div><div className="text-3xl font-bold tracking-tight">{current?.score ?? 0}%</div><div className="text-[11px] text-foreground/45">readiness score</div></div><div className="text-right text-xs"><div className="font-semibold">{current?.control_count ?? "—"}</div><div className="text-foreground/45">controls</div></div></div><div className="mt-4"><Progress value={current?.score ?? 0} tone={(current?.score ?? 0) < 80 ? "warning" : "primary"} /></div><p className="mt-4 text-xs font-semibold text-primary">Open framework workspace →</p></CardContent></Card></Link>;
        })}
      </div>
    </section>
    <Card className="mt-4"><CardContent className="p-5"><h2 className="text-sm font-semibold">All reporting frameworks</h2><div className="mt-4 space-y-4">{posture.isLoading ? <p className="text-sm text-foreground/45">Loading evidence registry…</p> : (posture.data?.frameworks ?? []).length === 0 ? <p className="text-sm text-foreground/45">No current evidence. Production remains blocked.</p> : posture.data?.frameworks.map((framework) => <div key={framework.name}><div className="mb-2 flex justify-between text-xs"><span>{framework.name}</span><strong>{framework.score}%</strong></div><Progress value={framework.score} tone={framework.score < 80 ? "warning" : "primary"} /></div>)}</div></CardContent></Card>
    <Modal open={reportOpen} onClose={() => setReportOpen(false)} title="Generate signed audit pack"><p className="text-sm text-foreground/60">The report contains the current evidence manifest, exceptions, approvals, and integrity hashes.</p><div className="mt-5 flex justify-end gap-2"><Button variant="outline" onClick={() => setReportOpen(false)}>Cancel</Button><Button onClick={() => setReportOpen(false)}>Queue report</Button></div></Modal>
  </>;
}
