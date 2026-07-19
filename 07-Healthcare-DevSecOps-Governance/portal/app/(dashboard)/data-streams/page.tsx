import { Activity, ClipboardList, FileHeart, FlaskConical, HeartPulse, Radio, ScanLine } from "lucide-react";
import Link from "next/link";
import { EthicalSourceStatus } from "@/components/dashboard/ethical-source-status";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardContent } from "@/components/ui/card";

const sources = [
  { href: "/data-streams/fhir", title: "FHIR R4", description: "Private HAPI with Synthea patient bundles", icon: FileHeart, tone: "from-blue-500 to-cyan-400" },
  { href: "/data-streams/hl7", title: "HL7 v2", description: "Synthetic ADT, ORM, ORU, and SIU events", icon: Activity, tone: "from-violet-500 to-fuchsia-400" },
  { href: "/data-streams/dicom", title: "DICOM", description: "TCIA metadata with collection attribution", icon: ScanLine, tone: "from-amber-500 to-orange-400" },
  { href: "/data-streams/iomt", title: "IoMT", description: "BIDMC public de-identified telemetry", icon: Radio, tone: "from-emerald-500 to-teal-400" },
  { href: "/data-streams/icu", title: "ICU", description: "MIMIC-IV, blocked until DUA approval", icon: HeartPulse, tone: "from-rose-500 to-pink-400" },
  { href: "/synthetic-phi", title: "Synthetic PHI", description: "Synthea FHIR, HL7, compliance, and IoMT test data", icon: FlaskConical, tone: "from-cyan-500 to-blue-500" },
  { href: "/compliance-events", title: "Compliance events", description: "Evidence, control mappings, drift, and scoring", icon: ClipboardList, tone: "from-indigo-500 to-violet-500" },
];

export default function DataStreamsPage() {
  return <div><PageHeader eyebrow="Healthcare data plane" title="Ingestion streams" description="Ethically governed normalized healthcare events. Raw source payloads remain isolated from the browser." /><EthicalSourceStatus /><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{sources.map(({ href, title, description, icon: Icon, tone }) => <Link key={href} href={href} className="focus-ring rounded-xl"><Card className="h-full transition hover:-translate-y-0.5 hover:border-primary/40"><CardContent className="p-5"><div className={`grid size-10 place-items-center rounded-xl bg-gradient-to-br ${tone} text-white shadow-lg`}><Icon className="size-5" /></div><h2 className="mt-5 text-lg font-semibold">{title}</h2><p className="mt-1 text-sm text-foreground/48">{description}</p><p className="mt-5 text-xs font-semibold text-primary">Open live dashboard →</p></CardContent></Card></Link>)}</div></div>;
}
