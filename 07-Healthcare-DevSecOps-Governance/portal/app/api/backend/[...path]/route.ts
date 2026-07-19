import { NextRequest, NextResponse } from "next/server";

const ALLOWED_METHODS = new Set(["GET", "POST", "PUT", "PATCH", "DELETE"]);
const MAX_BODY_BYTES = 2 * 1024 * 1024;

function hasValidOrigin(request: NextRequest): boolean {
  const value = request.headers.get("origin");
  if (!value) return false;
  try {
    const origin = new URL(value);
    const expectedHost = request.headers.get("x-forwarded-host")
      ?? request.headers.get("host");
    const expectedProtocol = request.headers.get("x-forwarded-proto")
      ?? request.nextUrl.protocol.replace(":", "");
    return origin.host === expectedHost && origin.protocol === `${expectedProtocol}:`;
  } catch {
    return false;
  }
}

async function proxy(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  if (!ALLOWED_METHODS.has(request.method)) {
    return NextResponse.json({ message: "Method not allowed" }, { status: 405 });
  }
  const session = request.cookies.get("__Host-healthgov-session")?.value
    ?? request.cookies.get("healthgov-session")?.value;
  if (!session) return NextResponse.json({ message: "Authentication required" }, { status: 401 });

  // State-changing calls must originate from this portal; SameSite is defense-in-depth,
  // not the sole CSRF control.
  if (request.method !== "GET" && !hasValidOrigin(request)) {
    return NextResponse.json({ message: "Invalid request origin" }, { status: 403 });
  }
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > MAX_BODY_BYTES) {
    return NextResponse.json({ message: "Request too large" }, { status: 413 });
  }
  const { path } = await context.params;
  if (path.some((segment) => !/^[a-zA-Z0-9._~-]+$/.test(segment))) {
    return NextResponse.json({ message: "Invalid path" }, { status: 400 });
  }
  const target = new URL(`/v1/session/proxy/${path.join("/")}`, process.env.AUTH_BFF_URL);
  request.nextUrl.searchParams.forEach((value, key) => target.searchParams.append(key, value));
  const headers = new Headers({
    "X-Session-ID": session,
    "X-Purpose-Of-Use": request.headers.get("X-Purpose-Of-Use") ?? "operations",
    "X-Request-ID": request.headers.get("X-Request-ID") ?? crypto.randomUUID(),
  });
  const contentType = request.headers.get("content-type");
  if (contentType) headers.set("Content-Type", contentType);
  const upstream = await fetch(target, {
    method: request.method,
    headers,
    body: request.method === "GET" ? undefined : await request.arrayBuffer(),
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });
  const responseHeaders = new Headers();
  for (const name of ["content-type", "x-request-id", "retry-after"]) {
    const value = upstream.headers.get(name);
    if (value) responseHeaders.set(name, value);
  }
  responseHeaders.set("Cache-Control", "no-store");
  return new NextResponse(upstream.body, { status: upstream.status, headers: responseHeaders });
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
