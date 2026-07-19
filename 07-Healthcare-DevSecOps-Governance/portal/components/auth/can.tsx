"use client";

import { type ReactNode } from "react";
import { can } from "@/lib/auth/permissions";
import { useSessionStore } from "@/store/session-store";
import type { Role } from "@/types";

export function Can({ permission, children, fallback = null }: { permission: string; children: ReactNode; fallback?: ReactNode }) {
  const role = useSessionStore((state) => state.session?.user.role) ?? ("Developer" as Role);
  return can(role, permission) ? children : fallback;
}

