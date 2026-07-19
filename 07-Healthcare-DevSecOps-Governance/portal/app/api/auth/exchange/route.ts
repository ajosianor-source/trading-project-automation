import { NextResponse, type NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const response = await fetch(`${process.env.AUTH_BFF_URL}/v1/session/exchange`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (!response.ok) return NextResponse.json({ message: "Authorization failed" }, { status: 401 });
  const { sessionId, expiresIn } = await response.json();
  const result = NextResponse.json({ authenticated: true });
  // Browser receives only an opaque session identifier, never refresh or access tokens.
  const secure = process.env.COOKIE_SECURE !== "false";
  result.cookies.set(secure ? "__Host-healthgov-session" : "healthgov-session", sessionId, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: Math.min(expiresIn, 8 * 60 * 60),
  });
  return result;
}
