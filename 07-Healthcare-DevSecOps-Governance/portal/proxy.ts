import { NextResponse, type NextRequest } from "next/server";

// API routes enforce their own session/CSRF controls and must return JSON status codes,
// never an HTML login redirect that API clients could misinterpret as success.
const publicPaths = ["/login", "/auth/callback", "/api/auth/", "/api/backend/"];
export function proxy(request: NextRequest) {
  const nonce = btoa(crypto.randomUUID());
  const development = process.env.NODE_ENV !== "production";
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${development ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
    "form-action 'self'",
  ].join("; ");
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);
  if (publicPaths.some((path) => request.nextUrl.pathname.startsWith(path))) {
    const publicResponse = NextResponse.next({ request: { headers: requestHeaders } });
    publicResponse.headers.set("Content-Security-Policy", csp);
    return publicResponse;
  }
  const session = request.cookies.get("__Host-healthgov-session")
    ?? request.cookies.get("healthgov-session");
  if (!session && process.env.NODE_ENV === "production") {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Content-Security-Policy", csp);
  return response;
}
export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
