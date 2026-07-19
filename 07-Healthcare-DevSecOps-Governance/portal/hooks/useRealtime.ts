"use client";

import { useQueryClient, type QueryKey } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

import { useRealtimeContext } from "@/components/providers/realtime-provider";
import type { RealtimeEvent, RealtimeTransport } from "@/lib/realtime/types";

interface Options<T> {
  channel: string;
  queryKey?: QueryKey;
  poll?: () => Promise<T>;
  pollInterval?: number;
  capacity?: number;
}

export function useRealtime<T>({
  channel,
  queryKey,
  poll,
  pollInterval = 5_000,
  capacity = 100,
}: Options<T>) {
  const { subscribe } = useRealtimeContext();
  const queryClient = useQueryClient();
  const [transport, setTransport] = useState<RealtimeTransport>("connecting");
  const [events, setEvents] = useState<RealtimeEvent<T>[]>([]);
  const invalidateAt = useRef(0);
  const queryKeyRef = useRef(queryKey);
  const pollRef = useRef(poll);
  queryKeyRef.current = queryKey;
  pollRef.current = poll;

  useEffect(
    () =>
      subscribe<T>({
        channel,
        poll: () => {
          if (!pollRef.current) return Promise.reject(new Error("Polling unavailable"));
          return pollRef.current();
        },
        pollInterval,
        onStatus: setTransport,
        onEvent: (event) => {
          setEvents((current) => [event, ...current].slice(0, capacity));
          if (queryKeyRef.current && Date.now() - invalidateAt.current > 750) {
            invalidateAt.current = Date.now();
            void queryClient.invalidateQueries({ queryKey: queryKeyRef.current });
          }
        },
      }),
    [capacity, channel, pollInterval, queryClient, subscribe],
  );

  return { transport, events, latest: events[0] };
}
