"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function PostureChart({ data = [] }: { data?: { date: string; posture: number; target: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={270}>
      <AreaChart data={data} margin={{ top: 12, right: 8, bottom: 0, left: -24 }}>
        <defs><linearGradient id="postureFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#2dd4bf" stopOpacity={0.35} /><stop offset="100%" stopColor="#2dd4bf" stopOpacity={0} /></linearGradient></defs>
        <CartesianGrid stroke="currentColor" className="text-foreground/[.07]" vertical={false} />
        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: "currentColor", opacity: 0.45, fontSize: 11 }} />
        <YAxis domain={[70, 100]} axisLine={false} tickLine={false} tick={{ fill: "currentColor", opacity: 0.45, fontSize: 11 }} />
        <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 10, fontSize: 12 }} />
        <Area type="monotone" dataKey="posture" stroke="#2dd4bf" strokeWidth={2.5} fill="url(#postureFill)" />
        <Area type="monotone" dataKey="target" stroke="#64748b" strokeDasharray="4 4" strokeWidth={1.5} fill="transparent" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
