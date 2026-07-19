"use client";

import { Radio, WifiOff } from "lucide-react";
import { motion } from "framer-motion";

import type { RealtimeTransport } from "@/lib/realtime/types";

export function ConnectionBadge({ transport }: { transport: RealtimeTransport }) {
  const live = transport === "websocket" || transport === "sse" || transport === "polling";
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider">
      {live ? <Radio className="size-3 text-emerald-500" /> : <WifiOff className="size-3 text-amber-500" />}
      <span className="relative flex size-2">
        {live && <motion.span className="absolute inline-flex size-full rounded-full bg-emerald-400" animate={{ scale: [1, 1.8], opacity: [0.7, 0] }} transition={{ repeat: Infinity, duration: 1.4 }} />}
        <span className={`relative inline-flex size-2 rounded-full ${live ? "bg-emerald-500" : "bg-amber-500"}`} />
      </span>
      {transport}
    </span>
  );
}
