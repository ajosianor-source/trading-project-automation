"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { iomtApi } from "@/lib/api/iomt";
import { useRealtime } from "@/hooks/useRealtime";

export function useIoMT(deviceId = "") {
  const queryClient = useQueryClient();
  const summary = useQuery({
    queryKey: ["ingestion", "iomt", "summary"],
    queryFn: iomtApi.summary,
    refetchInterval: false,
  });
  const telemetry = useQuery({
    queryKey: ["ingestion", "iomt", "telemetry", deviceId],
    queryFn: () => iomtApi.telemetry(deviceId),
    placeholderData: keepPreviousData,
    refetchInterval: false,
  });
  const publish = useMutation({
    mutationFn: iomtApi.ingest,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["ingestion", "iomt"] });
    },
  });
  const realtime = useRealtime({
    channel: "iomt",
    queryKey: ["ingestion", "iomt"],
    poll: iomtApi.summary,
    pollInterval: 1_000,
  });

  return {
    summary,
    telemetry,
    publish,
    isLoading: summary.isLoading || telemetry.isLoading,
    error: summary.error ?? telemetry.error,
    realtime,
  };
}
