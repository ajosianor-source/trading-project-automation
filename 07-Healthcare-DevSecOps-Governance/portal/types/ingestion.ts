export interface SourceSummary {
  accepted24h: number;
  rejected24h: number;
  eventsPerMinute: number;
  lastEventAt: string | null;
  status: "healthy" | "degraded" | "offline";
  trend: { time: string; accepted: number; rejected: number }[];
}

export interface FhirPatient {
  token: string;
  display: string;
  gender?: string;
  birthYear?: number;
  lastUpdated: string;
  resourceCount: number;
}

export interface Hl7Event {
  id: string;
  occurredAt: string;
  messageType: string;
  sendingApplication: string;
  facility: string;
  status: "accepted" | "rejected";
}

export interface DicomStudy {
  studyUid: string;
  patientToken: string;
  modality: string;
  bodyPart?: string;
  studyDate?: string;
  instances: number;
  quarantineStatus: "pending" | "scanned" | "released" | "rejected";
}

export interface IomtReading {
  eventId: string;
  deviceId: string;
  observedAt: string;
  sequence: number;
  measurements: Record<string, number | string>;
  trustStatus: "trusted" | "review" | "quarantined";
}

export interface IcuVital {
  eventId: string;
  patientToken: string;
  stayToken: string;
  observedAt: string;
  heartRate?: number;
  spo2?: number;
  systolicBp?: number;
  respiratoryRate?: number;
}

export interface Page<T> {
  items: T[];
  nextCursor: string | null;
  total: number;
}

export interface PhiAccessEvent {
  id: string;
  occurredAt: string;
  actorToken: string;
  patientToken: string;
  resource: string;
  purpose: string;
  decision: "allowed" | "denied" | "break-glass";
  location?: string;
  riskScore: number;
}

export interface PhiAccessSummary {
  readsToday: number;
  uniqueIdentities: number;
  deniedRequests: number;
  breakGlassEvents: number;
  hourly: { hour: string; allowed: number; denied: number }[];
  classification: { name: string; value: number }[];
}
