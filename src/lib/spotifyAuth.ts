// Server-side helpers for the Spotify Authorization Code flow, used to obtain a
// user access token for the Web Playback SDK (full-track playback needs a
// logged-in Premium user — the Client Credentials flow in spotify.ts can't do
// playback and no longer returns preview URLs).

const AUTHORIZE_URL = "https://accounts.spotify.com/authorize";
const TOKEN_URL = "https://accounts.spotify.com/api/token";

// Scopes: streaming is required by the Web Playback SDK; the two read scopes let
// the SDK read the account (and detect non-Premium).
export const SPOTIFY_SCOPES = "streaming user-read-email user-read-private";

// httpOnly cookie names holding the user's tokens.
export const COOKIE_ACCESS = "sp_access";
export const COOKIE_REFRESH = "sp_refresh";
export const COOKIE_EXPIRES = "sp_expires";
export const COOKIE_STATE = "sp_state";

export function getClientCreds(): { clientId: string; clientSecret: string } {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error(
      "Missing SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET. Add them to .env.local (see .env.example)."
    );
  }
  return { clientId, clientSecret };
}

// The app's own origin. Everything (redirect URI + post-login redirects) is built
// from this so the whole OAuth round-trip stays on ONE origin — otherwise the
// token cookies get set on a different host than the user lands on. Use
// http://127.0.0.1:3000 for local dev (Spotify rejects http://localhost).
export function getBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
}

export function isSecureBase(): boolean {
  return getBaseUrl().startsWith("https:");
}

// The redirect URI must exactly match one registered in the Spotify dashboard.
export function getRedirectUri(): string {
  return `${getBaseUrl()}/api/spotify/auth/callback`;
}

export function buildAuthorizeUrl(state: string): string {
  const { clientId } = getClientCreds();
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    scope: SPOTIFY_SCOPES,
    redirect_uri: getRedirectUri(),
    state,
  });
  return `${AUTHORIZE_URL}?${params.toString()}`;
}

type TokenResponse = {
  access_token: string;
  token_type: string;
  scope: string;
  expires_in: number;
  refresh_token?: string;
};

function basicAuthHeader(): string {
  const { clientId, clientSecret } = getClientCreds();
  return "Basic " + Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
}

export async function exchangeCode(code: string): Promise<TokenResponse> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: basicAuthHeader(),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: getRedirectUri(),
    }),
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Spotify token exchange failed (${res.status}): ${await res.text()}`);
  }
  return res.json();
}

export async function refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: basicAuthHeader(),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Spotify token refresh failed (${res.status}): ${await res.text()}`);
  }
  return res.json();
}
