import { NextRequest, NextResponse } from "next/server";
import {
  refreshAccessToken,
  isSecureBase,
  COOKIE_ACCESS,
  COOKIE_REFRESH,
  COOKIE_EXPIRES,
} from "@/lib/spotifyAuth";

// Returns a valid user access token for the Web Playback SDK's getOAuthToken
// callback, refreshing server-side when it's expired. 401 when not connected.
export async function GET(req: NextRequest) {
  const access = req.cookies.get(COOKIE_ACCESS)?.value;
  const refresh = req.cookies.get(COOKIE_REFRESH)?.value;
  const expires = Number(req.cookies.get(COOKIE_EXPIRES)?.value ?? 0);

  if (access && expires > Date.now() + 5000) {
    return NextResponse.json({
      access_token: access,
      expires_in: Math.floor((expires - Date.now()) / 1000),
    });
  }

  if (!refresh) {
    return NextResponse.json({ error: "not_connected" }, { status: 401 });
  }

  try {
    const token = await refreshAccessToken(refresh);
    const res = NextResponse.json({
      access_token: token.access_token,
      expires_in: token.expires_in,
    });
    const secure = isSecureBase();
    const base = { httpOnly: true, sameSite: "lax" as const, secure, path: "/" };
    res.cookies.set(COOKIE_ACCESS, token.access_token, { ...base, maxAge: token.expires_in });
    res.cookies.set(COOKIE_EXPIRES, String(Date.now() + token.expires_in * 1000), {
      ...base,
      maxAge: 60 * 60 * 24 * 30,
    });
    // Spotify may rotate the refresh token.
    if (token.refresh_token) {
      res.cookies.set(COOKIE_REFRESH, token.refresh_token, {
        ...base,
        maxAge: 60 * 60 * 24 * 30,
      });
    }
    return res;
  } catch {
    return NextResponse.json({ error: "refresh_failed" }, { status: 401 });
  }
}
