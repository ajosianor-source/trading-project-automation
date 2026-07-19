import type { RealtimeEvent, RealtimeSubscription, RealtimeTransport } from "./types";
import { eventStreamUrl, websocketUrl } from "./urls";

const CONNECT_TIMEOUT = 4_000;

export class RealtimeClient<T> {
  private stopped = false;
  private socket?: WebSocket;
  private stream?: EventSource;
  private timer?: ReturnType<typeof setInterval>;
  private reconnect?: ReturnType<typeof setTimeout>;
  private attempts = 0;

  constructor(private readonly subscription: RealtimeSubscription<T>) {}

  start() {
    this.stopped = false;
    this.subscription.onStatus("connecting");
    this.connectWebSocket();
    return () => this.stop();
  }

  stop() {
    this.stopped = true;
    this.socket?.close();
    this.stream?.close();
    if (this.timer) clearInterval(this.timer);
    if (this.reconnect) clearTimeout(this.reconnect);
  }

  private connectWebSocket() {
    if (this.stopped) return;
    let opened = false;
    const timeout = setTimeout(() => {
      if (!opened) {
        this.socket?.close();
        this.connectSse();
      }
    }, CONNECT_TIMEOUT);
    try {
      // Authentication uses the secure same-site session cookie. Tokens are never placed in URLs.
      this.socket = new WebSocket(websocketUrl(this.subscription.channel), ["healthgov.v1"]);
      this.socket.onopen = () => {
        opened = true;
        this.attempts = 0;
        clearTimeout(timeout);
        this.subscription.onStatus("websocket");
      };
      this.socket.onmessage = (message) => this.emit(message.data);
      this.socket.onerror = () => this.socket?.close();
      this.socket.onclose = () => {
        clearTimeout(timeout);
        if (!this.stopped) opened ? this.scheduleReconnect() : this.connectSse();
      };
    } catch {
      clearTimeout(timeout);
      this.connectSse();
    }
  }

  private connectSse() {
    if (this.stopped || this.stream) return;
    try {
      this.stream = new EventSource(eventStreamUrl(this.subscription.channel), {
        withCredentials: true,
      });
      this.stream.onopen = () => {
        this.attempts = 0;
        this.subscription.onStatus("sse");
      };
      this.stream.onmessage = (message) => this.emit(message.data);
      this.stream.onerror = () => {
        this.stream?.close();
        this.stream = undefined;
        this.startPolling();
      };
    } catch {
      this.startPolling();
    }
  }

  private startPolling() {
    if (this.stopped || this.timer) return;
    const poll = this.subscription.poll;
    if (!poll) {
      this.subscription.onStatus("offline");
      return;
    }
    this.subscription.onStatus("polling");
    const execute = async () => {
      try {
        const data = await poll();
        this.subscription.onEvent({
          channel: this.subscription.channel,
          type: "snapshot",
          occurredAt: new Date().toISOString(),
          data,
        });
      } catch {
        this.subscription.onStatus("offline");
      }
    };
    void execute();
    this.timer = setInterval(() => void execute(), this.subscription.pollInterval ?? 5_000);
  }

  private scheduleReconnect() {
    if (this.stopped) return;
    this.attempts += 1;
    const delay = Math.min(30_000, 1_000 * 2 ** Math.min(this.attempts, 5));
    this.subscription.onStatus("connecting");
    this.reconnect = setTimeout(() => this.connectWebSocket(), delay + Math.random() * 500);
  }

  private emit(raw: string) {
    try {
      const parsed = JSON.parse(raw) as RealtimeEvent<T>;
      this.subscription.onEvent(parsed);
    } catch {
      // Malformed stream messages are isolated; the connection remains available.
    }
  }
}
