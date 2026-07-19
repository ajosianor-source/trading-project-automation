import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({ loggedOut: true });
  const secure = process.env.COOKIE_SECURE !== "false";
  response.cookies.set(secure ? "__Host-healthgov-session" : "healthgov-session", "", {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}
