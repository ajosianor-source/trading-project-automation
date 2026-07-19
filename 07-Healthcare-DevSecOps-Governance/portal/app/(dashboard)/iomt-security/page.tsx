"use client";

import { useQuery } from "@tanstack/react-query";
import { Activity, HeartPulse, RadioTower, ScanLine, ShieldAlert, ShieldCheck, Wind } from "lucide-react";
import { governanceApi } from "@/lib/api/governance-modules";
import { PageHeader } from "@/components/dashboard/page-header";
import { MetricCard } from "@/components/dashboard/metric-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export default function IomtSecurityPage() {
  const posture = useQuery({ queryKey: ["iomt-posture"], queryFn: governanceApi.iomtPosture, refetchInterval: 5_000 });
  const devices = useQuery({ queryKey: ["iomt-security-devices"], queryFn: governanceApi.iomtDevices, refetchInterval: 5_000 });
  const profiles = useQuery({ queryKey: ["iomt-device-profiles"], queryFn: governanceApi.iomtProfiles, staleTime: 300_000 });
  const data = posture.data;
  const profilePresentation = {
    heart_monitor: { name: "Heart monitors", description: "Cardiac rhythm, lead status, and heart-rate integrity", icon: HeartPulse, tone: "from-rose-500 to-red-500" },
    ventilator: { name: "Ventilators", description: "Respiratory rate, tidal volume, and oxygen safeguards", icon: Wind, tone: "from-sky-500 to-blue-500" },
    wearable: { name: "Wearables", description: "Patient-worn telemetry, battery, and identity posture", icon: RadioTower, tone: "from-emerald-500 to-teal-500" },
    imaging: { name: "Imaging devices", description: "Scanner integrity, queue behavior, and signed firmware", icon: ScanLine, tone: "from-violet-500 to-fuchsia-500" },
  } as const;
  const deviceProfiles = profiles.data?.items ?? (Object.keys(profilePresentation).map((device_type) => ({
    device_type: device_type as keyof typeof profilePresentation,
    required_metrics: [],
    ranges: {},
    criticality: device_type === "wearable" ? 3 : device_type === "imaging" ? 4 : 5,
  })));
  return <>
    <PageHeader eyebrow="Connected medical devices" title="IoMT device security" description="Identity, signed firmware, anomaly detection, risk scoring, and fleet posture." />
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <MetricCard label="Enrolled devices" value={String(data?.total ?? 0)} icon={RadioTower} />
      <MetricCard label="Trusted" value={String(data?.trusted ?? 0)} icon={ShieldCheck} />
      <MetricCard label="Quarantined" value={String(data?.quarantined ?? 0)} icon={ShieldAlert} />
      <MetricCard label="Average risk" value={Number(data?.average_risk ?? 0).toFixed(1)} icon={Activity} />
    </div>
    <section className="mt-4" aria-labelledby="device-security-profiles">
      <div className="mb-3"><h2 id="device-security-profiles" className="text-sm font-semibold">Medical device security profiles</h2><p className="mt-1 text-xs text-foreground/45">Identity, firmware, telemetry, anomaly, and risk controls by device class</p></div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {deviceProfiles.map((profile) => {
          const presentation = profilePresentation[profile.device_type];
          const Icon = presentation.icon;
          return <Card key={profile.device_type} className="transition hover:-translate-y-0.5 hover:border-primary/40"><CardContent className="p-5">
            <div className={`grid size-10 place-items-center rounded-xl bg-gradient-to-br ${presentation.tone} text-white`}><Icon className="size-5" /></div>
            <h3 className="mt-4 font-semibold">{presentation.name}</h3><p className="mt-1 min-h-10 text-xs text-foreground/48">{presentation.description}</p>
            <div className="mt-4 flex items-center justify-between text-[11px]"><span className="text-foreground/45">Safety criticality</span><Badge>{profile.criticality} / 5</Badge></div>
            <p className="mt-3 text-[11px] text-foreground/45">{profile.required_metrics.length || "Profile"} monitored signals</p>
          </CardContent></Card>;
        })}
      </div>
    </section>
    <Card className="mt-4"><CardHeader><CardTitle>Device posture</CardTitle><Badge>5s refresh</Badge></CardHeader><CardContent>
      <div className="overflow-x-auto"><table className="w-full min-w-[800px] text-left text-xs"><thead><tr className="border-y border-border text-foreground/45"><th className="py-3">Device</th><th>Profile</th><th>Site</th><th>Firmware</th><th>Risk</th><th>Trust</th></tr></thead>
      <tbody>{devices.data?.items.map((device) => <tr key={device.device_id} className="border-b border-border/60"><td className="py-3 font-semibold">{device.device_id}</td><td>{device.device_type}</td><td>{device.site}</td><td className="font-mono">{device.firmware_version}</td><td><div className="flex w-36 items-center gap-2"><Progress value={device.risk_score} tone={device.risk_score > 70 ? "danger" : "warning"} /><span>{device.risk_score}</span></div></td><td><Badge>{device.trust_state}</Badge></td></tr>)}</tbody></table></div>
    </CardContent></Card>
  </>;
}
