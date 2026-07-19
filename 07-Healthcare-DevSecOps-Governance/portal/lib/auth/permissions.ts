import type { Role } from "@/types";

const permissions = {
  Admin: ["*"],
  Security: ["security:read", "security:write", "phi:read", "iomt:read", "ai:read"],
  Compliance: ["compliance:read", "compliance:report", "phi:read"],
  Developer: ["developer:read", "security:read", "api:execute"],
  Auditor: ["audit:read", "compliance:read", "evidence:read", "risk:read"],
  Executive: ["executive:read", "compliance:read", "risk:read", "incident:read"],
} satisfies Record<Role, string[]>;

export function can(role: Role, permission: string) {
  return permissions[role].includes("*") || permissions[role].includes(permission);
}
