export type RealtimeTransport = "connecting" | "websocket" | "sse" | "polling" | "offline";

export interface RealtimeEvent<T = unknown> {
  channel: string;
  type: string;
  sequence?: number;
  occurredAt: string;
  data: T;
}

export interface RealtimeSubscription<T> {
  channel: string;
  poll?: () => Promise<T>;
  pollInterval?: number;
  onEvent: (event: RealtimeEvent<T>) => void;
  onStatus: (transport: RealtimeTransport) => void;
}
