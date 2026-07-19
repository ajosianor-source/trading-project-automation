"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { useRealtime } from "@/hooks/useRealtime";
import { phiApi } from "@/lib/api/phi";

export function usePHIAccess(search = "", decision = "") {
  const summary = useQuery({
    queryKey: ["phi", "summary"],
    queryFn: phiApi.summary,
    refetchInterval: false,
  });
  const events = useQuery({
    queryKey: ["phi", "events", search, decision],
    queryFn: () => phiApi.events(search, decision),
    placeholderData: keepPreviousData,
    refetchInterval: false,
  });
  const realtime = useRealtime({
    channel: "phi-access",
    queryKey: ["phi"],
    poll: phiApi.summary,
    pollInterval: 2_000,
  });
  return {
    summary,
    events,
    realtime,
    isLoading: summary.isLoading || events.isLoading,
    error: summary.error ?? events.error,
  };
}
