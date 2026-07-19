"use client";

import { BookOpen, Braces, Copy, ExternalLink, Play, Search } from "lucide-react";
import { useState } from "react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

const endpoints = [
  ["POST", "/v1/classify", "Classify PHI fields", "phi-classifier"],
  ["POST", "/v1/evaluate", "Evaluate a compliance policy", "compliance"],
  ["POST", "/v1/fhir/$validate", "Validate a FHIR R4 resource", "clinical"],
  ["POST", "/v1/devices/attest", "Attest a medical device", "iomt"],
  ["POST", "/v1/models/assess", "Assess a clinical model", "ai-security"],
  ["POST", "/v1/reports/generate", "Generate a compliance report", "reporting"],
];

export default function DeveloperPage() {
  const [selected, setSelected] = useState(endpoints[0]);
  const [search, setSearch] = useState("");
  const visible = endpoints.filter((endpoint) => endpoint.join(" ").toLowerCase().includes(search.toLowerCase()));
  return <>
    <PageHeader eyebrow="Developer portal" title="Build on HealthGov" description="Explore tenant-aware APIs, integration guides, event schemas, and SDK contracts." actions={<Button variant="outline"><ExternalLink className="size-4" />View guides</Button>} />
    <div className="grid-dashboard">
      <Card className="lg:col-span-4"><CardHeader><CardTitle>API catalog</CardTitle><Badge>v1</Badge></CardHeader><CardContent><div className="relative mb-3"><Search className="absolute left-3 top-3 size-4 text-foreground/35" /><Input className="pl-9" placeholder="Search endpoints…" value={search} onChange={(event) => setSearch(event.target.value)} /></div><div className="space-y-1">{visible.map((endpoint) => <button key={endpoint[1]} onClick={() => setSelected(endpoint)} className={`w-full rounded-lg border p-3 text-left transition ${selected[1] === endpoint[1] ? "border-primary/30 bg-primary/10" : "border-transparent hover:bg-muted/50"}`}><div className="flex items-center gap-2"><Badge className="text-primary">{endpoint[0]}</Badge><code className="truncate text-[11px]">{endpoint[1]}</code></div><p className="mt-1.5 text-xs text-foreground/48">{endpoint[2]}</p></button>)}</div></CardContent></Card>
      <Card className="lg:col-span-8"><CardHeader><div><CardTitle>{selected[2]}</CardTitle><p className="mt-1 font-mono text-xs text-foreground/45">{selected[0]} {selected[1]}</p></div><Button size="sm"><Play className="size-3" />Try request</Button></CardHeader><CardContent><div className="mb-3 flex items-center gap-2 text-xs"><Badge>Request</Badge><span className="text-foreground/40">application/json</span><Button variant="ghost" size="icon" className="ml-auto" aria-label="Copy code"><Copy className="size-3.5" /></Button></div><pre className="overflow-x-auto rounded-xl border border-border bg-slate-950 p-5 font-mono text-xs leading-6 text-slate-300"><code>{`curl --request POST \\
  --url https://api.healthgov.example${selected[1]} \\
  --header 'Authorization: Bearer $ACCESS_TOKEN' \\
  --header 'X-Tenant-ID: hospital-a' \\
  --header 'X-Purpose-Of-Use: operations' \\
  --data '{"resourceType":"Observation"}'`}</code></pre><div className="mt-5 grid gap-3 sm:grid-cols-3">{[[BookOpen, "Authentication", "OAuth2, SMART and scopes"], [Braces, "Event schemas", "Kafka contracts and examples"], [ExternalLink, "SDK reference", "Python plugin contracts"]].map(([Icon, title, description]) => { const Component = Icon as typeof BookOpen; return <button key={String(title)} className="rounded-xl border border-border p-4 text-left transition hover:border-primary/30 hover:bg-primary/5"><Component className="size-4 text-primary" /><div className="mt-2 text-xs font-semibold">{String(title)}</div><p className="mt-1 text-[11px] text-foreground/40">{String(description)}</p></button>; })}</div></CardContent></Card>
    </div>
  </>;
}

