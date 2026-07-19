"use client";

import { type ReactNode, useState } from "react";
import { cn } from "@/lib/utils";

export function Tabs({ tabs, defaultValue }: { tabs: { value: string; label: string; content: ReactNode }[]; defaultValue?: string }) {
  const [active, setActive] = useState(defaultValue ?? tabs[0]?.value);
  return <div><div className="flex overflow-x-auto border-b border-border" role="tablist">{tabs.map((tab) => <button key={tab.value} role="tab" aria-selected={active === tab.value} onClick={() => setActive(tab.value)} className={cn("focus-ring -mb-px border-b-2 border-transparent px-4 py-3 text-xs font-medium text-foreground/45 transition", active === tab.value && "border-primary text-primary")}>{tab.label}</button>)}</div><div className="pt-4">{tabs.find((tab) => tab.value === active)?.content}</div></div>;
}

