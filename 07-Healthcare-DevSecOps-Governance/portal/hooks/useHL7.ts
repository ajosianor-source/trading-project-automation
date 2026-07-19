"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { hl7Api } from "@/lib/api/hl7";
import { useRealtime } from "@/hooks/useRealtime";

export function useHL7(search = "") {
  const queryClient = useQueryClient();
  const summary = useQuery({
    queryKey: ["ingestion", "hl7", "summary"],
    queryFn: hl7Api.summary,
    refetchInterval: false,
  });
  const events = useQuery({
    queryKey: ["ingestion", "hl7", "events", search],
    queryFn: () => hl7Api.events(search),
    placeholderData: keepPreviousData,
    refetchInterval: false,
  });
  const ingest = useMutation({
    mutationFn: ({ tenantId, message }: { tenantId: string; message: string }) => hl7Api.ingest(tenantId, message),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["ingestion", "hl7"] });
    },
  });
  const realtime = useRealtime({
    channel: "hl7",
    queryKey: ["ingestion", "hl7"],
    poll: hl7Api.summary,
    pollInterval: 3_000,
  });

  return {
    summary,
    events,
    ingest,
    isLoading: summary.isLoading || events.isLoading,
    error: summary.error ?? events.error,
    realtime,
  };
}
