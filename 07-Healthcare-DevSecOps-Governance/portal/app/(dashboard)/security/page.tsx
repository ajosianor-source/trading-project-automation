"use client";

import { Binary, Bug, ScanSearch, ShieldAlert } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { MetricCard } from "@/components/dashboard/metric-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RiskTable } from "@/components/dashboard/risk-table";
import { RiskDonut } from "@/components/charts/risk-donut";
import { Button } from "@/components/ui/button";

export default function SecurityPage() {
  return <>
    <PageHeader eyebrow="Application security" title="Security findings" description="Unified SAST, DAST, dependency, container, and infrastructure risk." actions={<Button>Run security assessment</Button>} />
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <MetricCard label="Critical findings" value="2" change="4" trend="down" icon={ShieldAlert} detail="in 30 days" />
      <MetricCard label="Mean time to remediate" value="2.4d" change="21%" trend="down" icon={Bug} detail="high severity" />
      <MetricCard label="Assets scanned" value="1,284" change="6.8%" icon={ScanSearch} detail="full coverage" />
      <MetricCard label="Pipeline block rate" value="3.1%" change="0.4%" trend="down" icon={Binary} detail="last 30 days" />
    </div>
    <div className="mt-4 grid-dashboard">
      <Card className="lg:col-span-3"><CardHeader><CardTitle>Open risk</CardTitle></CardHeader><CardContent><RiskDonut /></CardContent></Card>
      <Card className="lg:col-span-9"><CardHeader><div><CardTitle>Prioritized findings</CardTitle><p className="mt-1 text-xs text-foreground/40">Risk-ranked by exploitability, asset criticality, and clinical impact</p></div></CardHeader><CardContent><RiskTable /></CardContent></Card>
    </div>
  </>;
}
