"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Minimal typings for the Spotify Web Playback SDK globals we use.
type SpotifyPlayer = {
  connect: () => Promise<boolean>;
  disconnect: () => void;
  addListener: (event: string, cb: (payload: any) => void) => void;
  togglePlay: () => Promise<void>;
  nextTrack: () => Promise<void>;
  previousTrack: () => Promise<void>;
};

declare global {
  interface Window {
    onSpotifyWebPlaybackSDKReady?: () => void;
    Spotify?: {
      Player: new (opts: {
        name: string;
        getOAuthToken: (cb: (token: string) => void) => void;
        volume?: number;
      }) => SpotifyPlayer;
    };
  }
}

const SDK_SRC = "https://sdk.scdn.co/spotify-player.js";

type Status = "unknown" | "disconnected" | "connected";

// In-memory access-token cache shared across calls so the SDK's frequent
// getOAuthToken callbacks and every play() don't each round-trip our server.
let tokenCache: { value: string; expiresAt: number } | null = null;

async function fetchToken(): Promise<string | null> {
  if (tokenCache && tokenCache.expiresAt > Date.now() + 10_000) {
    return tokenCache.value;
  }
  try {
    const res = await fetch("/api/spotify/auth/token");
    if (!res.ok) {
      tokenCache = null;
      return null;
    }
    const data = await res.json();
    if (!data.access_token) return null;
    tokenCache = {
      value: data.access_token,
      expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000,
    };
    return data.access_token;
  } catch {
    return null;
  }
}

/**
 * Drives full-track playback of a mixtape via the Spotify Web Playback SDK.
 * Requires a logged-in Premium user (see the auth routes). `uris` is the ordered
 * list of playable `spotify:track:…` URIs.
 */
export function useSpotifyPlayer(uris: string[], returnTo: string) {
  const [status, setStatus] = useState<Status>("unknown");
  const [ready, setReady] = useState(false);
  const [needsPremium, setNeedsPremium] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [currentUri, setCurrentUri] = useState<string | null>(null);

  const playerRef = useRef<SpotifyPlayer | null>(null);
  const deviceIdRef = useRef<string | null>(null);
  const urisRef = useRef<string[]>(uris);
  urisRef.current = uris;

  const connectUrl = `/api/spotify/auth/login?returnTo=${encodeURIComponent(returnTo)}`;

  // Probe the session, then load the SDK + create the player only if connected.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const token = await fetchToken();
      if (cancelled) return;
      if (!token) {
        setStatus("disconnected");
        return;
      }
      setStatus("connected");

      const init = () => {
        if (cancelled || !window.Spotify || playerRef.current) return;
        const player = new window.Spotify.Player({
          name: "Mixtape Player",
          volume: 0.8,
          getOAuthToken: (cb) => {
            fetchToken().then((t) => {
              if (t) cb(t);
              else setStatus("disconnected");
            });
          },
        });

        player.addListener("ready", ({ device_id }: { device_id: string }) => {
          deviceIdRef.current = device_id;
          setReady(true);
        });
        player.addListener("not_ready", () => setReady(false));
        player.addListener("player_state_changed", (state: any) => {
          if (!state) return;
          setPlaying(!state.paused);
          setCurrentUri(state.track_window?.current_track?.uri ?? null);
        });
        player.addListener("account_error", () => setNeedsPremium(true));
        player.addListener("authentication_error", () => setStatus("disconnected"));
        player.addListener("initialization_error", () => setReady(false));

        player.connect();
        playerRef.current = player;
      };

      if (window.Spotify) {
        init();
      } else {
        window.onSpotifyWebPlaybackSDKReady = init;
        if (!document.querySelector(`script[src="${SDK_SRC}"]`)) {
          const script = document.createElement("script");
          script.src = SDK_SRC;
          script.async = true;
          document.body.appendChild(script);
        }
      }
    })();

    return () => {
      cancelled = true;
      playerRef.current?.disconnect();
      playerRef.current = null;
    };
  }, []);

  // Start the whole mixtape from a given position (Spotify handles the queue).
  const play = useCallback(async (index: number) => {
    const deviceId = deviceIdRef.current;
    const list = urisRef.current;
    if (!deviceId || list.length === 0) return;
    const token = await fetchToken();
    if (!token) {
      setStatus("disconnected");
      return;
    }
    await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ uris: list, offset: { position: Math.max(0, index) } }),
    }).catch(() => {});
  }, []);

  const toggle = useCallback(() => {
    playerRef.current?.togglePlay().catch(() => {});
  }, []);
  const next = useCallback(() => {
    playerRef.current?.nextTrack().catch(() => {});
  }, []);
  const prev = useCallback(() => {
    playerRef.current?.previousTrack().catch(() => {});
  }, []);

  const disconnect = useCallback(async () => {
    await fetch("/api/spotify/auth/logout", { method: "POST" }).catch(() => {});
    tokenCache = null;
    playerRef.current?.disconnect();
    playerRef.current = null;
    deviceIdRef.current = null;
    setReady(false);
    setPlaying(false);
    setCurrentUri(null);
    setNeedsPremium(false);
    setStatus("disconnected");
  }, []);

  return {
    status,
    ready,
    needsPremium,
    playing,
    currentUri,
    connectUrl,
    play,
    toggle,
    next,
    prev,
    disconnect,
  };
}
