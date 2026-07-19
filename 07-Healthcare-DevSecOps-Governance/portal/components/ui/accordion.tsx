"use client";

import { ChevronDown } from "lucide-react";
import { type ReactNode, useState } from "react";
import { cn } from "@/lib/utils";

export function Accordion({ items }: { items: { title: string; content: ReactNode }[] }) {
  const [open, setOpen] = useState<number | null>(0);
  return <div className="divide-y divide-border rounded-xl border border-border">{items.map((item, index) => <div key={item.title}><button className="flex w-full items-center justify-between p-4 text-left text-sm font-medium" onClick={() => setOpen(open === index ? null : index)} aria-expanded={open === index}>{item.title}<ChevronDown className={cn("size-4 transition-transform", open === index && "rotate-180")} /></button>{open === index && <div className="px-4 pb-4 text-sm text-foreground/55">{item.content}</div>}</div>)}</div>;
}

