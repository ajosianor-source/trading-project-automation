"use client";

import { Search } from "lucide-react";
import { useState } from "react";

import { PageHeader } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useFHIR } from "@/hooks/useFHIR";
import { EmptyState, QueryError, SourceMetrics, SourceStatus, ThroughputChart } from "@/dashboards/source-ui";

export function FhirDashboard() {
  const [search, setSearch] = useState("");
  const { summary, patients, error } = useFHIR(search);
  const items = patients.data?.items ?? [];
  return <div><PageHeader eyebrow="Interoperability / FHIR R4" title="FHIR ingestion" description="Tenant-scoped patient resources, bundle throughput, and normalization health." actions={<SourceStatus status={summary.data?.status} />} /><QueryError error={error} /><SourceMetrics summary={summary.data} /><div className="mt-4 grid gap-4 xl:grid-cols-[1.1fr_.9fr]"><ThroughputChart summary={summary.data} /><Card><CardHeader><div><CardTitle>Patient resources</CardTitle><p className="mt-1 text-xs text-foreground/45">Identifiers are tokenized before entering the dashboard read model.</p></div><Badge>{patients.data?.total ?? 0} records</Badge></CardHeader><CardContent><label className="relative block"><Search className="absolute left-3 top-2.5 size-4 text-foreground/35" /><Input aria-label="Search patients" className="pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search token or display name" /></label><div className="mt-3 max-h-80 overflow-auto">{items.length === 0 ? <EmptyState label="No patient resources match this query." /> : <table className="w-full text-left text-xs"><thead className="text-foreground/40"><tr><th className="py-2">Patient</th><th>FHIR resources</th><th>Updated</th></tr></thead><tbody>{items.map((patient) => <tr key={patient.token} className="border-t border-border"><td className="py-3"><p className="font-semibold">{patient.display}</p><p className="font-mono text-[10px] text-foreground/40">{patient.token}</p></td><td>{patient.resourceCount}</td><td>{new Date(patient.lastUpdated).toLocaleString()}</td></tr>)}</tbody></table>}</div></CardContent></Card></div></div>;
}
