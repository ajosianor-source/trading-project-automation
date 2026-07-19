"use client";

import { Search } from "lucide-react";
import { useState } from "react";

import { PageHeader } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { EmptyState, QueryError, SourceMetrics, SourceStatus, ThroughputChart } from "@/dashboards/source-ui";
import { useHL7 } from "@/hooks/useHL7";

export function Hl7Dashboard() {
  const [search, setSearch] = useState("");
  const { summary, events, error } = useHL7(search);
  const items = events.data?.items ?? [];
  return <div><PageHeader eyebrow="Interoperability / HL7 v2" title="HL7 event log" description="Operational visibility for parsed ADT, ORM, ORU, and SIU messages." actions={<SourceStatus status={summary.data?.status} />} /><QueryError error={error} /><SourceMetrics summary={summary.data} /><div className="mt-4 grid gap-4 xl:grid-cols-[.9fr_1.1fr]"><ThroughputChart summary={summary.data} title="HL7 message flow" /><Card><CardHeader><CardTitle>Recent messages</CardTitle><Badge>5s refresh</Badge></CardHeader><CardContent><label className="relative block"><Search className="absolute left-3 top-2.5 size-4 text-foreground/35" /><Input className="pl-9" aria-label="Search HL7 messages" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Message type, application, or facility" /></label><div className="mt-3 max-h-80 overflow-auto">{items.length === 0 ? <EmptyState label="No HL7 events have been received." /> : <table className="w-full text-left text-xs"><thead className="text-foreground/40"><tr><th className="py-2">Time</th><th>Type</th><th>Source</th><th>Status</th></tr></thead><tbody>{items.map((event) => <tr key={event.id} className="border-t border-border"><td className="py-3">{new Date(event.occurredAt).toLocaleTimeString()}</td><td className="font-mono font-semibold">{event.messageType}</td><td>{event.sendingApplication}<span className="block text-[10px] text-foreground/40">{event.facility}</span></td><td><Badge className={event.status === "accepted" ? "text-emerald-500" : "text-danger"}>{event.status}</Badge></td></tr>)}</tbody></table>}</div></CardContent></Card></div></div>;
}
