"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
export function PhiChart({ data = [] }: { data?: { hour: string; allowed: number; denied: number }[] }) {
  return <ResponsiveContainer width="100%" height={260}><BarChart data={data} margin={{ left: -28, right: 4 }}><CartesianGrid vertical={false} stroke="currentColor" className="text-foreground/[.07]" /><XAxis dataKey="hour" interval={3} axisLine={false} tickLine={false} tick={{ fill: "currentColor", opacity: .45, fontSize: 10 }} /><YAxis axisLine={false} tickLine={false} tick={{ fill: "currentColor", opacity: .45, fontSize: 10 }} /><Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 10 }} /><Bar dataKey="allowed" stackId="a" fill="#2dd4bf" radius={[3, 3, 0, 0]} /><Bar dataKey="denied" stackId="a" fill="#ef4444" radius={[3, 3, 0, 0]} /></BarChart></ResponsiveContainer>;
}
