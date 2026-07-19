"use client";

import { create } from "zustand";
import type { Session } from "@/types";

interface SessionState {
  session: Session | null;
  setSession: (session: Session) => void;
  clearSession: () => void;
}

// Access tokens intentionally remain in memory; refresh tokens belong in secure HttpOnly cookies.
export const useSessionStore = create<SessionState>((set) => ({
  session: null,
  setSession: (session) => set({ session }),
  clearSession: () => set({ session: null }),
}));

