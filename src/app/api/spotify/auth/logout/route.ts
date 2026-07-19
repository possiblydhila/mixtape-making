import { NextResponse } from "next/server";
import { COOKIE_ACCESS, COOKIE_REFRESH, COOKIE_EXPIRES } from "@/lib/spotifyAuth";

// Disconnects the Spotify session by clearing the token cookies.
export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(COOKIE_ACCESS);
  res.cookies.delete(COOKIE_REFRESH);
  res.cookies.delete(COOKIE_EXPIRES);
  return res;
}
