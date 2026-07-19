"use client";

import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";

export function MetricCard({ label, value, change, trend = "up", icon: Icon, detail }: { label: string; value: string; change?: string; trend?: "up" | "down"; icon: LucideIcon; detail?: string }) {
  const positive = (trend === "up" && !label.toLowerCase().includes("risk")) || (trend === "down" && label.toLowerCase().includes("risk"));
  return <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}><Card className="h-full overflow-hidden"><CardContent className="p-5"><div className="flex items-start justify-between"><span className="text-xs font-medium text-foreground/48">{label}</span><div className="grid size-8 place-items-center rounded-lg bg-primary/10 text-primary"><Icon className="size-4" /></div></div><div className="mt-3 metric-value">{value}</div>{(change || detail) && <div className="mt-2 flex items-center gap-1 text-[11px]">{change && <span className={positive ? "text-emerald-500" : "text-danger"}>{trend === "up" ? <ArrowUpRight className="inline size-3" /> : <ArrowDownRight className="inline size-3" />}{change}</span>}<span className="text-foreground/38">{detail}</span></div>}</CardContent></Card></motion.div>;
}
