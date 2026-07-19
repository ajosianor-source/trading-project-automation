"use client";

import { Filter, Search } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function FilterBar({ onSearch, placeholder = "Search…" }: { onSearch?: (value: string) => void; placeholder?: string }) {
  const [value, setValue] = useState("");
  return <div className="flex flex-col gap-2 sm:flex-row"><div className="relative flex-1"><Search className="absolute left-3 top-3 size-4 text-foreground/35" /><Input className="pl-9" value={value} placeholder={placeholder} onChange={(event) => { setValue(event.target.value); onSearch?.(event.target.value); }} /></div><Button variant="outline"><Filter className="size-4" />Filters</Button></div>;
}

