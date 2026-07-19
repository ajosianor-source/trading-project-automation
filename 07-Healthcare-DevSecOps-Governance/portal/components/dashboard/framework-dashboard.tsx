"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ClipboardCheck, FileCheck2, ShieldCheck } from "lucide-react";
import { governanceApi } from "@/lib/api/governance-modules";
import { PageHeader } from "./page-header";
import { MetricCard } from "./metric-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";

export function FrameworkDashboard({
  framework,
  title,
  description,
}: {
  framework: "dsp" | "iso27001" | "soc2";
  title: string;
  description: string;
}) {
  const query = useQuery({
    queryKey: ["framework-dashboard", framework],
    queryFn: () => governanceApi.frameworkDashboard(framework),
    refetchInterval: 30_000,
  });
  const data = query.data;
  return (
    <>
      <PageHeader eyebrow="Assurance framework" title={title} description={description} />
      {query.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((item) => <Skeleton key={item} className="h-32" />)}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Readiness score" value={`${data?.score ?? 0}%`} icon={ShieldCheck} />
          <MetricCard label="Mapped controls" value={String(data?.control_count ?? 0)} icon={ClipboardCheck} />
          <MetricCard label="Evidence freshness" value={`${data?.evidence_freshness ?? 0}%`} icon={FileCheck2} />
          <MetricCard label="Open drift" value={String(data?.open_drift ?? 0)} icon={AlertTriangle} />
        </div>
      )}
      <Card className="mt-4">
        <CardHeader><CardTitle>Control domains</CardTitle><span className="text-xs text-foreground/45">{data?.version}</span></CardHeader>
        <CardContent className="grid gap-5 md:grid-cols-2">
          {data?.domains.map((domain) => (
            <div key={domain.name}>
              <div className="mb-2 flex justify-between text-xs"><span>{domain.name}</span><span>{domain.controls} controls</span></div>
              <Progress value={data.control_count ? (domain.controls / data.control_count) * 100 : 0} />
            </div>
          ))}
          {query.isError && <p className="text-sm text-danger">Framework posture is temporarily unavailable.</p>}
        </CardContent>
      </Card>
    </>
  );
}
