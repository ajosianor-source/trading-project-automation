"use client";

import { AnimatePresence, motion } from "framer-motion";
import { GripVertical, Maximize2, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/utils";
import { useDashboardLayoutStore, type WidgetSpan } from "@/store/dashboard-layout-store";

export interface DashboardWidget {
  id: string;
  title: string;
  content: ReactNode;
  defaultSpan?: WidgetSpan;
}

const spanClass: Record<WidgetSpan, string> = {
  4: "lg:col-span-4",
  6: "lg:col-span-6",
  8: "lg:col-span-8",
  12: "lg:col-span-12",
};

export function InteractiveGrid({ dashboard, widgets }: { dashboard: string; widgets: DashboardWidget[] }) {
  const { layouts, ensure, move, resize, reset } = useDashboardLayoutStore();
  const [dragging, setDragging] = useState<string>();
  const [expanded, setExpanded] = useState<DashboardWidget>();
  const ids = useMemo(() => widgets.map((widget) => widget.id), [widgets]);
  useEffect(() => ensure(dashboard, ids), [dashboard, ensure, ids]);
  const layout = layouts[dashboard];
  const ordered = (layout?.order ?? ids).map((id) => widgets.find((widget) => widget.id === id)).filter(Boolean) as DashboardWidget[];

  return (
    <>
      <div className="mb-2 flex justify-end"><Button size="sm" variant="ghost" onClick={() => reset(dashboard)}><RotateCcw className="size-3" />Reset layout</Button></div>
      <motion.div layout className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <AnimatePresence>
          {ordered.map((widget) => {
            const span = layout?.spans[widget.id] ?? widget.defaultSpan ?? 6;
            return <motion.section layout key={widget.id} draggable onDragStart={() => setDragging(widget.id)} onDragOver={(event) => event.preventDefault()} onDrop={() => dragging && move(dashboard, dragging, widget.id)} onDragEnd={() => setDragging(undefined)} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={cn("group min-w-0 rounded-xl border border-transparent transition hover:border-primary/20", spanClass[span], dragging === widget.id && "opacity-50")}><div className="flex h-8 items-center rounded-t-xl border border-b-0 border-border bg-card px-2 text-[10px] text-foreground/40"><GripVertical className="mr-1 size-3 cursor-grab" /><span className="font-semibold uppercase tracking-wider">{widget.title}</span><div className="ml-auto flex items-center gap-1"><label className="sr-only" htmlFor={`${dashboard}-${widget.id}-size`}>Widget width</label><select id={`${dashboard}-${widget.id}-size`} value={span} onChange={(event) => resize(dashboard, widget.id, Number(event.target.value) as WidgetSpan)} className="rounded border-0 bg-transparent text-[10px] outline-none"><option value={4}>S</option><option value={6}>M</option><option value={8}>L</option><option value={12}>Full</option></select><button className="rounded p-1 hover:bg-muted" onClick={() => setExpanded(widget)} aria-label={`Expand ${widget.title}`}><Maximize2 className="size-3" /></button></div></div><div className="[&>*]:rounded-t-none">{widget.content}</div></motion.section>;
          })}
        </AnimatePresence>
      </motion.div>
      <Modal open={Boolean(expanded)} onClose={() => setExpanded(undefined)} title={expanded?.title ?? "Widget"}><div className="max-h-[75vh] overflow-auto p-1">{expanded?.content}</div></Modal>
    </>
  );
}
