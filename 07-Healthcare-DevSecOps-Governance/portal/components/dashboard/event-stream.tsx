"use client";

import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";

export function EventStream({ events = [] }: { events?: { time: string; kind: string; message: string; tone: string }[] }) {
  return <div className="space-y-1">{events.map((event, index) => <motion.div key={`${event.time}-${event.kind}`} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * .06 }} className="flex items-start gap-3 rounded-lg px-2 py-2.5 hover:bg-muted/45"><span className={`mt-1.5 size-1.5 shrink-0 rounded-full ${event.tone === "danger" ? "bg-danger" : event.tone === "warning" ? "bg-warning" : "bg-emerald-400"}`} /><div className="min-w-0 flex-1"><p className="truncate text-xs font-medium">{event.message}</p><div className="mt-1 flex items-center gap-2"><Badge className="text-[9px]">{event.kind}</Badge><span className="font-mono text-[9px] text-foreground/35">{event.time}</span></div></div></motion.div>)}</div>;
}
