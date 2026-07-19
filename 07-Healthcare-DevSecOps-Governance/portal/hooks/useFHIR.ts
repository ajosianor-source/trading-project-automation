"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { fhirApi } from "@/lib/api/fhir";
import { useRealtime } from "@/hooks/useRealtime";

export function useFHIR(search = "") {
  const queryClient = useQueryClient();
  const summary = useQuery({
    queryKey: ["ingestion", "fhir", "summary"],
    queryFn: fhirApi.summary,
    refetchInterval: false,
  });
  const patients = useQuery({
    queryKey: ["ingestion", "fhir", "patients", search],
    queryFn: () => fhirApi.patients(search),
    placeholderData: keepPreviousData,
    refetchInterval: false,
  });
  const ingest = useMutation({
    mutationFn: ({ tenantId, bundle }: { tenantId: string; bundle: object }) => fhirApi.ingestBundle(tenantId, bundle),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["ingestion", "fhir"] });
    },
  });
  const realtime = useRealtime({
    channel: "fhir",
    queryKey: ["ingestion", "fhir"],
    poll: fhirApi.summary,
    pollInterval: 5_000,
  });

  return {
    summary,
    patients,
    ingest,
    isLoading: summary.isLoading || patients.isLoading,
    error: summary.error ?? patients.error,
    realtime,
  };
}
