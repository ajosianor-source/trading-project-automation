const apiOrigin = process.env.NEXT_PUBLIC_API_URL ?? "/api";
const configuredOrigin = process.env.NEXT_PUBLIC_REALTIME_URL ?? apiOrigin;

function absoluteOrigin(value: string): URL {
  if (typeof window === "undefined") return new URL(value, "http://localhost");
  return new URL(value, window.location.origin);
}

export function websocketUrl(channel: string): string {
  const url = absoluteOrigin(configuredOrigin);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  url.pathname = `${url.pathname.replace(/\/$/, "")}/v1/realtime/${channel}`;
  return url.toString();
}

export function eventStreamUrl(channel: string): string {
  const url = absoluteOrigin(configuredOrigin);
  url.pathname = `${url.pathname.replace(/\/$/, "")}/v1/realtime/${channel}/events`;
  return url.toString();
}
