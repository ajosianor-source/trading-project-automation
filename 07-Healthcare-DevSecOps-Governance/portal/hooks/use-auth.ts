"use client";

import { useRouter } from "next/navigation";
import { useSessionStore } from "@/store/session-store";

export function useAuth() {
  const router = useRouter();
  const { session, clearSession } = useSessionStore();
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    clearSession();
    router.replace("/login");
  }
  return { session, logout, authenticated: Boolean(session) };
}

