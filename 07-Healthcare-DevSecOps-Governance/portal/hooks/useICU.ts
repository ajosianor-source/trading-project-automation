"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { icuApi } from "@/lib/api/icu";
import { useRealtime } from "@/hooks/useRealtime";

export function useICU(patientId = "") {
  const queryClient = useQueryClient();
  const summary = useQuery({
    queryKey: ["ingestion", "icu", "summary"],
    queryFn: icuApi.summary,
    refetchInterval: false,
  });
  const vitals = useQuery({
    queryKey: ["ingestion", "icu", "vitals", patientId],
    queryFn: () => icuApi.vitals(patientId),
    placeholderData: keepPreviousData,
    refetchInterval: false,
  });
  const ingest = useMutation({
    mutationFn: ({ tenantId, tables }: { tenantId: string; tables: string[] }) => icuApi.ingest(tenantId, tables),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["ingestion", "icu"] });
    },
  });
  const realtime = useRealtime({
    channel: "icu",
    queryKey: ["ingestion", "icu"],
    poll: icuApi.summary,
    pollInterval: 1_000,
  });

  return {
    summary,
    vitals,
    ingest,
    isLoading: summary.isLoading || vitals.isLoading,
    error: summary.error ?? vitals.error,
    realtime,
  };
}
