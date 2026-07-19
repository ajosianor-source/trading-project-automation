"use client";

import { useQuery } from "@tanstack/react-query";
import { Fingerprint, Search } from "lucide-react";
import { useState } from "react";

import { PageHeader } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { stakeholderApi } from "@/lib/api/stakeholders";

export default function AuditPage() {
  const [domain, setDomain] = useState("");
  const audit = useQuery({ queryKey: ["stakeholders", "audit", domain], queryFn: () => stakeholderApi.audit(domain), refetchInterval: 10_000 });
  const rows = audit.data?.items ?? [];
  return <div><PageHeader eyebrow="Assurance / Forensics" title="Immutable audit trail" description="PHI, FHIR, HL7, IoMT, and AI inference traceability with chained integrity evidence." actions={<Badge><Fingerprint className="mr-1 size-3" />{audit.data?.integrity ?? "verifying"}</Badge>} /><Card><CardHeader><CardTitle>Forensic event ledger</CardTitle><Badge>{audit.data?.total ?? 0} events</Badge></CardHeader><CardContent><label className="relative block max-w-md"><Search className="absolute left-3 top-2.5 size-4 text-foreground/35" /><Input className="pl-9" value={domain} onChange={(event) => setDomain(event.target.value)} placeholder="Filter domain: phi, fhir, hl7, iomt, ai…" /></label><div className="mt-4">{audit.isLoading ? <Skeleton className="h-64" /> : rows.length === 0 ? <div className="grid h-64 place-items-center rounded-lg border border-dashed border-border text-sm text-foreground/45">No audit records match this domain.</div> : <table className="w-full min-w-[720px] text-left text-xs"><thead><tr><th>Time</th><th>Domain</th><th>Action</th><th>Actor</th><th>Outcome</th><th>Digest</th></tr></thead><tbody>{rows.map((event) => <tr className="border-t border-border" key={event.audit_id}><td className="py-3">{new Date(event.occurred_at).toLocaleString()}</td><td>{event.event_domain}</td><td>{event.action}</td><td className="font-mono">{event.actor_token}</td><td>{event.outcome}</td><td className="max-w-36 truncate font-mono">{event.event_digest}</td></tr>)}</tbody></table>}</div></CardContent></Card></div>;
}
