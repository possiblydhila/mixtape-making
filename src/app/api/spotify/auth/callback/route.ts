import { NextRequest, NextResponse } from "next/server";
import {
  exchangeCode,
  getBaseUrl,
  isSecureBase,
  COOKIE_ACCESS,
  COOKIE_REFRESH,
  COOKIE_EXPIRES,
  COOKIE_STATE,
} from "@/lib/spotifyAuth";

// Spotify redirects here with `code` + `state`. Verify state, exchange the code
// for tokens, drop them in httpOnly cookies, then return to the mixtape page.
export async function GET(req: NextRequest) {
  // Build redirects from the configured base URL, not req origin (Next's dev
  // origin can differ, e.g. localhost vs 127.0.0.1, which would strand cookies).
  const origin = getBaseUrl();
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const error = req.nextUrl.searchParams.get("error");

  const stateCookie = req.cookies.get(COOKIE_STATE)?.value ?? "";
  const [savedState, savedReturnTo] = stateCookie.split("|");
  const returnTo = savedReturnTo?.startsWith("/") ? savedReturnTo : "/";

  const secure = isSecureBase();

  function fail() {
    const url = new URL(returnTo, origin);
    url.searchParams.set("spotify", "error");
    const res = NextResponse.redirect(url);
    res.cookies.delete(COOKIE_STATE);
    return res;
  }

  if (error || !code || !state || !savedState || state !== savedState) {
    return fail();
  }

  try {
    const token = await exchangeCode(code);
    const res = NextResponse.redirect(new URL(returnTo, origin));

    const base = { httpOnly: true, sameSite: "lax" as const, secure, path: "/" };
    res.cookies.set(COOKIE_ACCESS, token.access_token, { ...base, maxAge: token.expires_in });
    res.cookies.set(COOKIE_EXPIRES, String(Date.now() + token.expires_in * 1000), {
      ...base,
      maxAge: 60 * 60 * 24 * 30,
    });
    if (token.refresh_token) {
      res.cookies.set(COOKIE_REFRESH, token.refresh_token, {
        ...base,
        maxAge: 60 * 60 * 24 * 30, // refresh tokens are long-lived
      });
    }
    res.cookies.delete(COOKIE_STATE);
    return res;
  } catch {
    return fail();
  }
}
