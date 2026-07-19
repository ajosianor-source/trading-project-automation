"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { FilterBar } from "./filter-bar";
import { Badge } from "@/components/ui/badge";
import { stakeholderApi } from "@/lib/api/stakeholders";

export function RiskTable() {
  const [query, setQuery] = useState("");
  const risks = useQuery({ queryKey: ["security", "risks"], queryFn: stakeholderApi.risks });
  const rows = useMemo(
    () => (risks.data?.items ?? []).filter((item) =>
      Object.values(item).join(" ").toLowerCase().includes(query.toLowerCase())),
    [query, risks.data],
  );
  return <div><div className="mb-4"><FilterBar onSearch={setQuery} placeholder="Search risks or assets…" /></div><div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-xs"><thead className="border-y border-border text-[10px] uppercase tracking-wider text-foreground/40"><tr><th className="px-3 py-3">Risk</th><th className="px-3">Asset token</th><th className="px-3">Domain</th><th className="px-3">Likelihood</th><th className="px-3">Impact</th><th className="px-3">Residual</th></tr></thead><tbody>{rows.map((row) => <tr key={row.risk_id} className="border-b border-border/60 transition hover:bg-muted/30"><td className="px-3 py-3 font-mono font-semibold">{row.risk_id.slice(0, 12)}</td><td className="px-3 font-mono">{row.asset_token}</td><td className="px-3"><Badge>{row.domain}</Badge></td><td className="px-3">{row.likelihood}</td><td className="px-3">{row.impact}</td><td className="px-3 font-semibold">{row.residual_score}</td></tr>)}</tbody></table>{!risks.isLoading && rows.length === 0 && <p className="py-10 text-center text-sm text-foreground/45">No live risks match this filter.</p>}</div></div>;
}
