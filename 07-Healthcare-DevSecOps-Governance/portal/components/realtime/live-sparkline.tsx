"use client";

import { Area, AreaChart, ResponsiveContainer } from "recharts";

export function LiveSparkline({ values, color = "#5b8def" }: { values: number[]; color?: string }) {
  const data = values.slice(-30).map((value, index) => ({ index, value }));
  return <div className="h-10 w-24" aria-label="Live trend sparkline"><ResponsiveContainer width="100%" height="100%"><AreaChart data={data}><Area isAnimationActive type="monotone" dataKey="value" stroke={color} fill={color} fillOpacity={0.12} strokeWidth={1.5} dot={false} /></AreaChart></ResponsiveContainer></div>;
}
