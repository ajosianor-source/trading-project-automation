"use client";

import { motion } from "framer-motion";
import { FileUp, ScanLine, Search } from "lucide-react";
import { useRef, useState } from "react";

import { PageHeader } from "@/components/dashboard/page-header";
import { ConnectionBadge } from "@/components/realtime/connection-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  EmptyState,
  QueryError,
  SourceMetrics,
  SourceStatus,
  ThroughputChart,
} from "@/dashboards/source-ui";
import { useDICOM } from "@/hooks/useDICOM";
import { useSessionStore } from "@/store/session-store";

export function DicomDashboard() {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string>();
  const inputRef = useRef<HTMLInputElement>(null);
  const tenantId = useSessionStore((state) => state.session?.user.tenantId);
  const { summary, studies, ingest, error, realtime } = useDICOM(search);
  const items = studies.data?.items ?? [];
  const upload = (file?: File) => {
    if (file && tenantId) ingest.mutate(file);
  };

  return <div><PageHeader eyebrow="Imaging / DICOM" title="DICOM metadata" description="Live quarantined imaging metadata. Pixel data remains isolated from the browser." actions={<><input ref={inputRef} className="hidden" type="file" accept=".dcm,application/dicom" onChange={(event) => upload(event.target.files?.[0])} /><Button disabled={!tenantId || ingest.isPending} onClick={() => inputRef.current?.click()}><FileUp className="size-4" />{ingest.isPending ? "Scanning…" : "Upload DICOM"}</Button><ConnectionBadge transport={realtime.transport} /><SourceStatus status={summary.data?.status} /></>} /><QueryError error={error ?? ingest.error} /><SourceMetrics summary={summary.data} /><div className="mt-4 grid gap-4 xl:grid-cols-[.8fr_1.2fr]"><ThroughputChart summary={summary.data} title="Study ingestion" /><Card><CardHeader><div><CardTitle>Imaging metadata viewer</CardTitle><p className="mt-1 text-xs text-foreground/45">Synthetic modality thumbnails indicate type; no diagnostic pixels are rendered.</p></div><Badge>{studies.data?.total ?? 0} studies</Badge></CardHeader><CardContent><label className="relative block"><Search className="absolute left-3 top-2.5 size-4 text-foreground/35" /><Input className="pl-9" aria-label="Search DICOM studies" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Study UID, token, modality" /></label><div className="mt-3 grid max-h-80 gap-2 overflow-auto sm:grid-cols-2">{items.length === 0 ? <div className="sm:col-span-2"><EmptyState label="No DICOM studies are available." /></div> : items.map((study) => <motion.button layout whileHover={{ y: -2 }} onClick={() => setSelected(study.studyUid)} key={study.studyUid} className={`flex gap-3 rounded-lg border p-3 text-left transition ${selected === study.studyUid ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"}`}><div className="grid size-16 shrink-0 place-items-center rounded-md bg-gradient-to-br from-slate-800 to-slate-950 text-slate-300"><ScanLine className="size-6" /><span className="sr-only">Metadata-only {study.modality} thumbnail</span></div><div className="min-w-0 text-xs"><p className="font-semibold">{study.modality} · {study.bodyPart ?? "Unspecified"}</p><p className="mt-1 truncate font-mono text-[9px] text-foreground/40">{study.studyUid}</p><p className="mt-2">{study.instances} instances</p><Badge className="mt-1">{study.quarantineStatus}</Badge></div></motion.button>)}</div></CardContent></Card></div></div>;
}
