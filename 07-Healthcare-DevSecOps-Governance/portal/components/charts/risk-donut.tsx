"use client";

import { useQuery } from "@tanstack/react-query";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import { stakeholderApi } from "@/lib/api/stakeholders";

const colors = ["#ef4444", "#f97316", "#f59e0b", "#2dd4bf", "#64748b"];

export function RiskDonut() {
  const query = useQuery({ queryKey: ["risk", "donut"], queryFn: stakeholderApi.risks });
  const grouped = Object.entries(
    (query.data?.items ?? []).reduce<Record<string, number>>((result, item) => {
      result[item.domain] = (result[item.domain] ?? 0) + 1;
      return result;
    }, {}),
  ).map(([name, value]) => ({ name, value }));
  const total = grouped.reduce((sum, item) => sum + item.value, 0);
  return (
    <div className="relative h-[220px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart><Pie data={grouped} dataKey="value" innerRadius={65} outerRadius={85} paddingAngle={3} stroke="none">{grouped.map((item, index) => <Cell key={item.name} fill={colors[index % colors.length]} />)}</Pie><Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 10 }} /></PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 grid place-content-center text-center"><strong className="text-3xl">{total}</strong><span className="text-[11px] text-foreground/45">OPEN RISKS</span></div>
    </div>
  );
}
