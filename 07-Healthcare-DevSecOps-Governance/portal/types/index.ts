export type Role =
  | "Admin"
  | "Security"
  | "Compliance"
  | "Developer"
  | "Auditor"
  | "Executive";
export type Severity = "critical" | "high" | "medium" | "low";

export interface Session {
  user: { name: string; email: string; role: Role; tenantId: string };
  accessToken: string;
  expiresAt: number;
}

export interface ApiError {
  code: string;
  message: string;
  requestId?: string;
}
