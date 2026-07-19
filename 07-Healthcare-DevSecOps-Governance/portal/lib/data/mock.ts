export const postureTrend = [
  { date: "Jan", posture: 82, target: 90, risk: 31 },
  { date: "Feb", posture: 85, target: 90, risk: 28 },
  { date: "Mar", posture: 84, target: 90, risk: 24 },
  { date: "Apr", posture: 89, target: 92, risk: 19 },
  { date: "May", posture: 92, target: 92, risk: 16 },
  { date: "Jun", posture: 94, target: 94, risk: 12 },
  { date: "Jul", posture: 96.4, target: 94, risk: 8 },
];

export const frameworkPosture = [
  { name: "HIPAA", value: 98, controls: 74, color: "#2dd4bf" },
  { name: "GDPR", value: 95, controls: 61, color: "#38bdf8" },
  { name: "FDA Part 11", value: 93, controls: 42, color: "#818cf8" },
  { name: "ISO 13485", value: 94, controls: 58, color: "#c084fc" },
  { name: "ISO 14971", value: 91, controls: 39, color: "#f59e0b" },
];

export const riskBySeverity = [
  { name: "Critical", value: 2, fill: "#ef4444" },
  { name: "High", value: 12, fill: "#f97316" },
  { name: "Medium", value: 38, fill: "#f59e0b" },
  { name: "Low", value: 91, fill: "#2dd4bf" },
];

export const phiAccess = Array.from({ length: 24 }, (_, hour) => ({
  hour: `${String(hour).padStart(2, "0")}:00`,
  allowed: Math.round(220 + Math.sin(hour / 3) * 70 + hour * 3),
  denied: Math.max(1, Math.round(5 + Math.cos(hour / 2) * 4)),
}));

export const vulnerabilities = [
  { id: "CVE-2026-1842", asset: "fhir-gateway", severity: "critical", source: "Trivy", age: "2h", owner: "Clinical Platform" },
  { id: "SNYK-PY-9214", asset: "reporting-service", severity: "high", source: "Snyk", age: "8h", owner: "Governance" },
  { id: "SEM-441", asset: "device-onboarding", severity: "high", source: "Semgrep", age: "1d", owner: "IoMT Security" },
  { id: "CVE-2026-0911", asset: "dicom-quarantine", severity: "medium", source: "Trivy", age: "2d", owner: "Imaging" },
  { id: "IAC-208", asset: "aks/production", severity: "low", source: "Checkov", age: "3d", owner: "Cloud Platform" },
];

export const devices = [
  { name: "Infusion Pump A-184", site: "St. Anne / ICU", type: "Infusion", trust: 99, status: "Trusted", firmware: "4.8.2" },
  { name: "Bedside Monitor B-42", site: "St. Anne / CCU", type: "Monitor", trust: 97, status: "Trusted", firmware: "12.1.0" },
  { name: "CT Console C-7", site: "North Imaging", type: "Imaging", trust: 88, status: "Review", firmware: "8.4.1" },
  { name: "Ventilator V-229", site: "West / ICU", type: "Respiratory", trust: 100, status: "Trusted", firmware: "6.2.5" },
  { name: "Pump Legacy P-14", site: "West / Ward 3", type: "Infusion", trust: 61, status: "Quarantined", firmware: "2.1.0" },
];

export const events = [
  { time: "11:42:08", kind: "Policy", message: "HIPAA minimum-necessary policy allowed request", tone: "ok" },
  { time: "11:41:51", kind: "IoMT", message: "Device certificate rotated for pump A-184", tone: "ok" },
  { time: "11:40:12", kind: "Security", message: "Critical container finding blocked release", tone: "danger" },
  { time: "11:38:44", kind: "PHI", message: "Break-glass access initiated — review opened", tone: "warning" },
  { time: "11:36:02", kind: "AI", message: "Federated round 84 passed privacy budget", tone: "ok" },
];

