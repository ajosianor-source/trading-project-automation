"use client";

import { Eye, KeyRound, Search, ShieldX, Users } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { InteractiveGrid } from "@/components/dashboard/interactive-grid";
import { PageHeader } from "@/components/dashboard/page-header";
import { AnimatedNumber } from "@/components/realtime/animated-number";
import { ConnectionBadge } from "@/components/realtime/connection-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs } from "@/components/ui/tabs";
import { usePHIAccess } from "@/hooks/usePHIAccess";

const colors = ["#5b8def", "#24b47e", "#f59e0b", "#ef4444"];

export default function PhiAccessPage() {
  const [search, setSearch] = useState("");
  const [decision, setDecision] = useState("");
  const { summary, events, realtime, isLoading, error } = usePHIAccess(search, decision);
  const data = summary.data;
  const rows = events.data?.items ?? [];
  const metrics = [
    { label: "PHI reads today", value: data?.readsToday ?? 0, icon: Eye, color: "text-primary" },
    { label: "Unique identities", value: data?.uniqueIdentities ?? 0, icon: Users, color: "text-cyan-500" },
    { label: "Denied requests", value: data?.deniedRequests ?? 0, icon: ShieldX, color: "text-danger" },
    { label: "Break-glass events", value: data?.breakGlassEvents ?? 0, icon: KeyRound, color: "text-amber-500" },
  ];

  const activity = <Card><CardHeader><div><CardTitle>Access activity</CardTitle><p className="mt-1 text-xs text-foreground/40">Live authorization decisions by hour</p></div><Badge>streaming</Badge></CardHeader><CardContent className="h-72">{!data ? <Skeleton className="h-full" /> : <ResponsiveContainer width="100%" height="100%"><BarChart data={data.hourly}><CartesianGrid vertical={false} stroke="var(--border)" /><XAxis dataKey="hour" tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 10 }} /><Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10 }} /><Bar dataKey="allowed" stackId="a" fill="#24b47e" isAnimationActive /><Bar dataKey="denied" stackId="a" fill="#ef4444" isAnimationActive /></BarChart></ResponsiveContainer>}</CardContent></Card>;
  const classification = <Card><CardHeader><CardTitle>PHI classification</CardTitle></CardHeader><CardContent className="h-72">{!data ? <Skeleton className="h-full" /> : <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={data.classification} dataKey="value" nameKey="name" innerRadius={62} outerRadius={92} paddingAngle={3} isAnimationActive>{data.classification.map((entry, index) => <Cell key={entry.name} fill={colors[index % colors.length]} />)}</Pie><Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10 }} /></PieChart></ResponsiveContainer>}</CardContent></Card>;
  const eventTable = <Card><CardHeader><div><CardTitle>PHI access monitor</CardTitle><p className="mt-1 text-xs text-foreground/40">Pseudonymized, purpose-bound audit events</p></div><Badge>{rows.length} visible</Badge></CardHeader><CardContent><div className="flex flex-col gap-2 sm:flex-row"><label className="relative flex-1"><Search className="absolute left-3 top-2.5 size-4 text-foreground/35" /><Input value={search} onChange={(event) => setSearch(event.target.value)} className="pl-9" placeholder="Actor, patient token, resource…" aria-label="Search access events" /></label><select value={decision} onChange={(event) => setDecision(event.target.value)} className="h-10 rounded-lg border border-border bg-card px-3 text-xs"><option value="">All decisions</option><option value="allowed">Allowed</option><option value="denied">Denied</option><option value="break-glass">Break glass</option></select></div><div className="mt-3 max-h-80 overflow-auto" aria-live="polite">{isLoading ? <Skeleton className="h-48" /> : rows.length === 0 ? <div className="grid h-32 place-items-center rounded-lg border border-dashed border-border text-sm text-foreground/40">Waiting for access events</div> : <table className="w-full min-w-[700px] text-left text-xs"><thead className="sticky top-0 bg-card text-foreground/40"><tr><th className="py-2">Time</th><th>Actor</th><th>Resource</th><th>Purpose</th><th>Decision</th><th>Risk</th></tr></thead><tbody>{rows.map((event) => <motion.tr layout initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} key={event.id} className="border-t border-border hover:bg-muted/40"><td className="py-3">{new Date(event.occurredAt).toLocaleTimeString()}</td><td className="font-mono">{event.actorToken}</td><td>{event.resource}<span className="block font-mono text-[9px] text-foreground/35">{event.patientToken}</span></td><td>{event.purpose}</td><td><Badge className={event.decision === "allowed" ? "text-emerald-500" : event.decision === "denied" ? "text-danger" : "text-amber-500"}>{event.decision}</Badge></td><td>{event.riskScore}</td></motion.tr>)}</tbody></table>}</div></CardContent></Card>;

  return <div><PageHeader eyebrow="Privacy operations" title="PHI access analytics" description="Purpose-bound access monitoring with live transport failover and customizable widgets." actions={<ConnectionBadge transport={realtime.transport} />} />{error && <div role="alert" className="mb-4 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-foreground/60">Live API unavailable; transport will continue reconnecting.</div>}<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{metrics.map(({ label, value, icon: Icon, color }) => <motion.div key={label} whileHover={{ y: -3, scale: 1.01 }} whileTap={{ scale: 0.99 }}><Card className="cursor-pointer"><CardContent className="p-5"><div className="flex justify-between"><span className="text-xs text-foreground/48">{label}</span><Icon className={`size-4 ${color}`} /></div><div className="mt-3 text-3xl font-semibold"><AnimatedNumber value={value} /></div></CardContent></Card></motion.div>)}</div><div className="mt-4"><Tabs tabs={[{ value: "operations", label: "Operations", content: <InteractiveGrid dashboard="phi-access" widgets={[{ id: "activity", title: "Access activity", content: activity, defaultSpan: 8 }, { id: "classification", title: "Classification", content: classification, defaultSpan: 4 }, { id: "events", title: "Live events", content: eventTable, defaultSpan: 12 }]} /> }, { value: "investigation", label: "Investigation queue", content: eventTable }]} /></div></div>;
}
