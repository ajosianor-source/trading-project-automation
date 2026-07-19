"use client";

import { createContext, useCallback, useContext, type ReactNode } from "react";

import { RealtimeClient } from "@/lib/realtime/client";
import type { RealtimeSubscription } from "@/lib/realtime/types";

interface RealtimeContextValue {
  subscribe: <T>(subscription: RealtimeSubscription<T>) => () => void;
}

const RealtimeContext = createContext<RealtimeContextValue | null>(null);

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const subscribe = useCallback(<T,>(subscription: RealtimeSubscription<T>) => {
    const client = new RealtimeClient(subscription);
    return client.start();
  }, []);
  return <RealtimeContext.Provider value={{ subscribe }}>{children}</RealtimeContext.Provider>;
}

export function useRealtimeContext() {
  const value = useContext(RealtimeContext);
  if (!value) throw new Error("useRealtimeContext must be used inside RealtimeProvider");
  return value;
}
