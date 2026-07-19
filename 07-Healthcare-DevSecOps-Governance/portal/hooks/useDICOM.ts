"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { dicomApi } from "@/lib/api/dicom";
import { useRealtime } from "@/hooks/useRealtime";

export function useDICOM(search = "") {
  const queryClient = useQueryClient();
  const summary = useQuery({
    queryKey: ["ingestion", "dicom", "summary"],
    queryFn: dicomApi.summary,
    refetchInterval: false,
  });
  const studies = useQuery({
    queryKey: ["ingestion", "dicom", "studies", search],
    queryFn: () => dicomApi.studies(search),
    placeholderData: keepPreviousData,
    refetchInterval: false,
  });
  const ingest = useMutation({
    mutationFn: dicomApi.ingest,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["ingestion", "dicom"] });
    },
  });
  const realtime = useRealtime({
    channel: "dicom",
    queryKey: ["ingestion", "dicom"],
    poll: dicomApi.summary,
    pollInterval: 5_000,
  });

  return {
    summary,
    studies,
    ingest,
    isLoading: summary.isLoading || studies.isLoading,
    error: summary.error ?? studies.error,
    realtime,
  };
}
