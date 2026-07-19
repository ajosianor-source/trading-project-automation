"use client";

import { useQuery } from "@tanstack/react-query";
import { Blocks, PlugZap } from "lucide-react";

import { PageHeader } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { stakeholderApi } from "@/lib/api/stakeholders";

export default function MarketplacePage() {
  const connectors = useQuery({ queryKey: ["stakeholders", "connectors"], queryFn: stakeholderApi.connectors, staleTime: 60_000 });
  return <div><PageHeader eyebrow="Healthcare ecosystem" title="Marketplace integrations" description="Governed connectivity for EHR vendors, interoperability networks, and cloud healthcare platforms." actions={<Button><Blocks className="size-4" />Plugin marketplace</Button>} /><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{connectors.isLoading ? Array.from({ length: 6 }, (_, index) => <Skeleton key={index} className="h-44 rounded-xl" />) : connectors.data?.connectors.map((connector) => <Card key={connector.vendor} className="transition hover:-translate-y-0.5 hover:border-primary/40"><CardContent className="p-5"><div className="flex items-start justify-between"><div className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary"><PlugZap className="size-5" /></div><Badge className="text-emerald-500">{connector.status}</Badge></div><h2 className="mt-5 text-lg font-semibold capitalize">{connector.vendor.replaceAll("_", " ")}</h2><p className="mt-2 text-xs text-foreground/45">{connector.standards.join(" · ")}</p><Button className="mt-5 w-full" variant="outline">Configure connection</Button></CardContent></Card>)}</div></div>;
}
