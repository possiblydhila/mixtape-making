import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { buildAuthorizeUrl, isSecureBase, COOKIE_STATE } from "@/lib/spotifyAuth";

// Kicks off the Authorization Code flow: stash a CSRF `state` (+ where to return
// afterwards) in an httpOnly cookie, then bounce to Spotify's consent screen.
export async function GET(req: NextRequest) {
  const returnToParam = req.nextUrl.searchParams.get("returnTo") || "/";
  // Only allow same-site paths to avoid an open-redirect via `returnTo`.
  const returnTo = returnToParam.startsWith("/") ? returnToParam : "/";

  const state = randomUUID();

  const res = NextResponse.redirect(buildAuthorizeUrl(state));
  res.cookies.set(COOKIE_STATE, `${state}|${returnTo}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: isSecureBase(),
    path: "/",
    maxAge: 600, // 10 minutes to complete the round-trip
  });
  return res;
}
