import type { Track } from "./types";

// Server-side only helper for talking to the Spotify Web API using the
// Client Credentials flow (no user login required — good for search and
// reading public playlists). Requires SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET
// to be set in the environment (see .env.example).

let cachedToken: { value: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 5000) {
    return cachedToken.value;
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error(
      "Missing SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET. Add them to .env.local (see .env.example)."
    );
  }

  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Spotify auth failed (${res.status}): ${text}`);
  }

  const data = await res.json();
  cachedToken = {
    value: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
  return cachedToken.value;
}

function mapSpotifyTrack(t: any): Track {
  return {
    id: t.id,
    title: t.name,
    artist: (t.artists || []).map((a: any) => a.name).join(", "),
    album: t.album?.name,
    albumArt: t.album?.images?.[1]?.url ?? t.album?.images?.[0]?.url,
    durationMs: t.duration_ms,
    spotifyUrl: t.external_urls?.spotify,
    previewUrl: t.preview_url ?? null,
    source: "spotify",
  };
}

export async function searchTracks(query: string, limit = 10): Promise<Track[]> {
  if (!query.trim()) return [];
  const token = await getAccessToken();
  const url = new URL("https://api.spotify.com/v1/search");
  url.searchParams.set("q", query);
  url.searchParams.set("type", "track");
  url.searchParams.set("limit", String(limit));

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Spotify search failed (${res.status}): ${text}`);
  }

  const data = await res.json();
  return (data.tracks?.items ?? []).map(mapSpotifyTrack);
}

// Accepts a full playlist URL, a spotify: URI, or a bare playlist ID.
export function extractPlaylistId(input: string): string | null {
  const trimmed = input.trim();
  const urlMatch = trimmed.match(/playlist\/([a-zA-Z0-9]+)/);
  if (urlMatch) return urlMatch[1];
  const uriMatch = trimmed.match(/spotify:playlist:([a-zA-Z0-9]+)/);
  if (uriMatch) return uriMatch[1];
  if (/^[a-zA-Z0-9]{10,}$/.test(trimmed)) return trimmed;
  return null;
}

export async function getPlaylistTracks(playlistId: string): Promise<{
  name: string;
  tracks: Track[];
}> {
  const token = await getAccessToken();

  const playlistRes = await fetch(
    `https://api.spotify.com/v1/playlists/${playlistId}?fields=name,tracks.next,tracks.items(track(id,name,artists,album,duration_ms,external_urls,preview_url))`,
    { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }
  );

  if (!playlistRes.ok) {
    const text = await playlistRes.text();
    throw new Error(`Spotify playlist fetch failed (${playlistRes.status}): ${text}`);
  }

  const playlistData = await playlistRes.json();
  let items = playlistData.tracks?.items ?? [];
  let nextUrl: string | null = playlistData.tracks?.next ?? null;

  // Paginate through the rest of the playlist (Spotify returns 100 at a time).
  while (nextUrl) {
    const nextRes: Response = await fetch(nextUrl, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!nextRes.ok) break;
    const nextData = await nextRes.json();
    items = items.concat(nextData.items ?? []);
    nextUrl = nextData.next ?? null;
  }

  const tracks: Track[] = items
    .map((item: any) => item.track)
    .filter((t: any) => t && t.id)
    .map(mapSpotifyTrack);

  return { name: playlistData.name ?? "Imported Playlist", tracks };
}
