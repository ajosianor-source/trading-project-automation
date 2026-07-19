"use client";

import { Bot, BrainCircuit, Network, ScanLine } from "lucide-react";
import { MetricCard } from "@/components/dashboard/metric-card";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";

const models = [
  ["Sepsis Early Warning", "v4.8.2", 97, "Production", "Healthy"],
  ["Radiology Triage", "v2.4.0", 93, "Production", "Healthy"],
  ["Readmission Risk", "v6.1.1", 81, "Shadow", "Review"],
  ["Clinical Notes LLM", "v1.9.3", 88, "Staging", "Testing"],
];

export default function AiSecurityPage() {
  return <>
    <PageHeader eyebrow="Clinical AI assurance" title="AI / ML security" description="Model provenance, adversarial resilience, drift, privacy, and federated learning." actions={<Button>Assess model</Button>} />
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <MetricCard label="Governed models" value="48" change="6" icon={BrainCircuit} detail="this quarter" />
      <MetricCard label="Security pass rate" value="94.8%" change="2.1%" icon={ScanLine} detail="last 30 days" />
      <MetricCard label="Federated sites" value="17" change="3" icon={Network} detail="attested" />
      <MetricCard label="Privacy budget" value="72%" change="6%" trend="down" icon={Bot} detail="remaining" />
    </div>
    <div className="mt-4 grid-dashboard">
      <Card className="lg:col-span-8"><CardHeader><CardTitle>Clinical model inventory</CardTitle><Badge>48 models</Badge></CardHeader><CardContent><div className="overflow-x-auto"><table className="w-full min-w-[620px] text-left text-xs"><thead className="border-y border-border text-[10px] uppercase tracking-wider text-foreground/40"><tr><th className="py-3">Model</th><th>Version</th><th>Assurance</th><th>Stage</th><th>Status</th></tr></thead><tbody>{models.map(([name, version, score, stage, status]) => <tr key={name} className="border-b border-border/60 hover:bg-muted/30"><td className="py-4 font-semibold">{name}</td><td className="font-mono">{version}</td><td><div className="flex w-32 items-center gap-2"><Progress value={Number(score)} tone={Number(score) < 85 ? "warning" : "primary"} /><b>{score}</b></div></td><td>{stage}</td><td><Badge className={status === "Healthy" ? "text-emerald-500" : "text-amber-500"}>{status}</Badge></td></tr>)}</tbody></table></div></CardContent></Card>
      <Card className="lg:col-span-4"><CardHeader><CardTitle>Federated round 84</CardTitle><Badge className="text-emerald-500">Aggregating</Badge></CardHeader><CardContent className="space-y-4">{[["Participants", "17 / 17", 100], ["Secure updates", "17", 100], ["Privacy budget", "ε 3.2 / 8", 40], ["Round progress", "72%", 72]].map(([label, value, progress]) => <div key={String(label)}><div className="mb-1.5 flex justify-between text-xs"><span className="text-foreground/50">{label}</span><strong>{value}</strong></div><Progress value={Number(progress)} /></div>)}<p className="rounded-lg bg-muted/50 p-3 text-[11px] leading-relaxed text-foreground/50">All participants passed attestation. Robust aggregation and update clipping are active.</p></CardContent></Card>
    </div>
  </>;
}
