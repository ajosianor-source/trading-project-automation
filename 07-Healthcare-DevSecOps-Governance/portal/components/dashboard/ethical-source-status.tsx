"use client";

import { useQuery } from "@tanstack/react-query";
import { ShieldCheck, ShieldX } from "lucide-react";
import { sourceApi } from "@/lib/api/sources";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function EthicalSourceStatus() {
  const query = useQuery({ queryKey: ["ethical-sources"], queryFn: sourceApi.list });
  return <Card className="mb-4"><CardHeader><div><CardTitle>Governed source catalogue</CardTitle><p className="mt-1 text-xs text-foreground/45">Only approved synthetic, public de-identified, or DUA-controlled datasets can enter the platform.</p></div><Badge>{query.data?.items.length ?? 0} sources</Badge></CardHeader><CardContent><div className="grid gap-2 md:grid-cols-2 xl:grid-cols-5">{query.isLoading ? <p className="text-xs text-foreground/45">Loading source governance status…</p> : query.isError ? <p className="text-xs text-danger">The source registry could not be reached. Expired sessions reconnect automatically.</p> : query.data?.items.map((source) => <div key={source.source_id} className="rounded-lg border border-border p-3"><div className="flex items-center gap-2">{source.enabled ? <ShieldCheck className="size-4 text-emerald-500" /> : <ShieldX className="size-4 text-amber-500" />}<strong className="text-xs">{source.name}</strong></div><p className="mt-2 text-[10px] text-foreground/45">{source.access_tier} · {source.license}</p><Badge className="mt-2">{source.enabled ? "Approved" : "Approval required"}</Badge></div>)}</div></CardContent></Card>;
}
