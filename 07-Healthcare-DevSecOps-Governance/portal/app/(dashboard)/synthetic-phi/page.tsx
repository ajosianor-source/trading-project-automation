"use client";

import { useMutation } from "@tanstack/react-query";
import { Database, FileJson2, Radio, TestTube2 } from "lucide-react";
import { useState } from "react";
import { governanceApi } from "@/lib/api/governance-modules";
import { PageHeader } from "@/components/dashboard/page-header";
import { MetricCard } from "@/components/dashboard/metric-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function SyntheticPhiPage() {
  const [count, setCount] = useState(25);
  const generation = useMutation({ mutationFn: () => governanceApi.generateSynthetic(count) });
  return <>
    <PageHeader eyebrow="Privacy-safe test data" title="Synthetic healthcare data" description="Generate explicitly tagged, expiring FHIR, HL7 v2, compliance, and IoMT test datasets." />
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <MetricCard label="FHIR R4" value="Bundle" icon={FileJson2} />
      <MetricCard label="HL7 v2" value="ADT A01" icon={Radio} />
      <MetricCard label="IoMT profiles" value="4" icon={TestTube2} />
      <MetricCard label="Classification" value="SYNTHETIC" icon={Database} />
    </div>
    <Card className="mt-4"><CardHeader><CardTitle>New governed dataset</CardTitle></CardHeader>
      <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-end">
        <label className="text-xs font-medium">Records per data type<Input className="mt-2" type="number" min={1} max={500} value={count} onChange={(event) => setCount(Number(event.target.value))} /></label>
        <Button disabled={generation.isPending} onClick={() => generation.mutate()}>{generation.isPending ? "Generating…" : "Generate dataset"}</Button>
        {generation.data && <p className="text-xs text-emerald-500">Accepted: {generation.data.dataset_id}</p>}
        {generation.isError && <p className="text-xs text-danger">Generation failed.</p>}
      </CardContent>
    </Card>
  </>;
}
