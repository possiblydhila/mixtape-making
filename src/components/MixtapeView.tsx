"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Cassette from "@/components/Cassette";
import { useSpotifyPlayer } from "@/lib/useSpotifyPlayer";
import type { Mixtape, Track } from "@/lib/types";

function formatDuration(ms?: number) {
  if (!ms) return "";
  const totalSec = Math.round(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, "0")}`;
}

// A playable Spotify URI, or null for manual (non-Spotify) tracks.
function trackUri(t: Track): string | null {
  return t.source === "spotify" && t.id && !t.id.startsWith("manual-")
    ? `spotify:track:${t.id}`
    : null;
}

export default function MixtapeView({ mixtape }: { mixtape: Mixtape }) {
  const router = useRouter();
  const pathname = usePathname();
  const { tracks, note } = mixtape;

  const [flipped, setFlipped] = useState(false);
  const [copied, setCopied] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [connectError, setConnectError] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // Ordered list of playable Spotify URIs (manual tracks are skipped).
  const uris: string[] = [];
  const uriToPos = new Map<string, number>();
  for (const t of tracks) {
    const uri = trackUri(t);
    if (uri) {
      uriToPos.set(uri, uris.length);
      uris.push(uri);
    }
  }
  const hasPlayable = uris.length > 0;

  const player = useSpotifyPlayer(uris, pathname || `/mixtape/${mixtape.id}`);
  const connected = player.status === "connected";
  const canPlay = connected && player.ready && !player.needsPremium && hasPlayable;

  // Which row is highlighted: the SDK's current track when playing, else a local
  // cursor used for the silent (not-connected) deck.
  const [localIndex, setLocalIndex] = useState(0);
  const sdkIndex = player.currentUri
    ? tracks.findIndex((t) => trackUri(t) === player.currentUri)
    : -1;
  const currentIndex = canPlay && sdkIndex >= 0 ? sdkIndex : localIndex;
  const currentTrack = tracks[currentIndex];

  const atStart = !canPlay && currentIndex <= 0;
  const atEnd = !canPlay && currentIndex >= tracks.length - 1;

  // Surface a failed Spotify connection (?spotify=error from the callback).
  useEffect(() => {
    if (typeof window !== "undefined" && window.location.search.includes("spotify=error")) {
      setConnectError(true);
    }
  }, []);

  function onPrev() {
    if (canPlay) player.prev();
    else setLocalIndex((i) => Math.max(0, i - 1));
  }
  function onNext() {
    if (canPlay) player.next();
    else setLocalIndex((i) => Math.min(tracks.length - 1, i + 1));
  }
  function onPlay() {
    if (!canPlay) return;
    if (player.playing || player.currentUri) player.toggle();
    else player.play(0);
  }
  function onRow(i: number) {
    const uri = trackUri(tracks[i]);
    if (canPlay && uri) player.play(uriToPos.get(uri)!);
    else if (!connected) setLocalIndex(i);
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard may be unavailable — fall back silently
    }
  }

  async function exportImage() {
    if (!cardRef.current) return;
    setExporting(true);
    if (flipped) {
      setFlipped(false);
      await new Promise((r) => setTimeout(r, 750));
    }
    try {
      const { toPng } = await import("html-to-image");
      const dataUrl = await toPng(cardRef.current, { pixelRatio: 2, backgroundColor: "#12100e" });
      const link = document.createElement("a");
      link.download = `${mixtape.title.replace(/\s+/g, "-").toLowerCase()}-mixtape.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error(err);
    } finally {
      setExporting(false);
    }
  }

  const playLabel = player.playing ? "⏸ Pause" : "▶ Play";

  return (
    <main className="max-w-md mx-auto px-4 py-8">
      <div ref={cardRef} className="rounded-2xl bg-[#1a1512] border border-cream/10 p-6">
        {(mixtape.fromName || mixtape.toName) && (
          <p className="text-center text-cream/50 text-sm mb-5 font-mono">
            {mixtape.toName && <>for <span className="text-cream">{mixtape.toName}</span></>}
            {mixtape.fromName && <> — from <span className="text-cream">{mixtape.fromName}</span></>}
          </p>
        )}

        <Cassette
          cassette={mixtape.cassette}
          note={note}
          flipped={flipped}
          spinning={canPlay && player.playing}
          onFlip={note ? () => setFlipped((f) => !f) : undefined}
        />

        {note && (
          <div className="mt-3 flex justify-center">
            <button
              onClick={() => setFlipped((f) => !f)}
              className="px-4 py-1.5 rounded-full text-sm border border-cream/25 text-cream/70 hover:text-cream hover:border-cream/40 transition"
            >
              tap to flip &amp; read the note
            </button>
          </div>
        )}

        {/* Transport */}
        {tracks.length > 0 && (
          <div className="mt-6">
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={onPrev}
                disabled={atStart}
                className="py-3 rounded-md border border-cream/25 text-cream/80 font-semibold uppercase tracking-wide text-sm hover:bg-cream/10 disabled:opacity-30 transition"
                aria-label="Previous track"
              >
                ⏮ Prev
              </button>

              {connected ? (
                <button
                  type="button"
                  onClick={onPlay}
                  disabled={!canPlay}
                  className="py-3 rounded-md bg-cream text-ink font-semibold uppercase tracking-wide text-sm hover:bg-cream/90 disabled:opacity-40 transition"
                  aria-label={player.playing ? "Pause" : "Play"}
                >
                  {player.needsPremium ? "Premium only" : !player.ready ? "Loading…" : playLabel}
                </button>
              ) : (
                <a
                  href={hasPlayable ? player.connectUrl : undefined}
                  aria-disabled={!hasPlayable}
                  className={`py-3 rounded-md bg-green-500 text-white font-semibold uppercase tracking-wide text-xs flex items-center justify-center text-center transition ${
                    hasPlayable ? "hover:bg-green-400" : "opacity-40 pointer-events-none"
                  }`}
                >
                  Connect Spotify
                </a>
              )}

              <button
                type="button"
                onClick={onNext}
                disabled={atEnd}
                className="py-3 rounded-md border border-cream/25 text-cream/80 font-semibold uppercase tracking-wide text-sm hover:bg-cream/10 disabled:opacity-30 transition"
                aria-label="Next track"
              >
                Next ⏭
              </button>
            </div>

            {currentTrack && (
              <p className="mt-3 text-xs text-cream/50 text-center truncate">
                <span className="text-cream/40 uppercase tracking-wide">Now</span>{" "}
                {currentIndex + 1}/{tracks.length} · {currentTrack.title}{" "}
                <span className="text-cream/40">— {currentTrack.artist}</span>
              </p>
            )}

            {/* Playback status / help line */}
            <p className="mt-1 text-[11px] text-center text-cream/40">
              {!hasPlayable ? (
                "No Spotify tracks in this mixtape to play."
              ) : connectError ? (
                <span className="text-red-400">Couldn&apos;t connect to Spotify — try again.</span>
              ) : player.needsPremium ? (
                "Spotify Premium is required to play the songs."
              ) : connected && player.ready ? (
                <button onClick={player.disconnect} className="hover:text-cream underline">
                  Connected to Spotify · Disconnect
                </button>
              ) : connected ? (
                "Starting Spotify player…"
              ) : (
                "Connect your Spotify Premium to play the full songs."
              )}
            </p>
          </div>
        )}

        {/* Songlist */}
        <ol className="mt-5 space-y-1">
          {tracks.map((t, i) => {
            const isCurrent = i === currentIndex;
            const playable = Boolean(trackUri(t));
            return (
              <li key={`${t.id}-${i}`}>
                <button
                  type="button"
                  onClick={() => onRow(i)}
                  className={`w-full flex items-center gap-2 text-sm rounded-md px-2 py-2 text-left transition border ${
                    isCurrent
                      ? "bg-cream/10 border-cream/25"
                      : "border-transparent hover:bg-cream/5"
                  }`}
                >
                  <span className="w-5 text-cream/40 flex-shrink-0">
                    {isCurrent && canPlay && player.playing ? "♪" : i + 1}
                  </span>
                  <span className="flex-1 truncate">
                    {t.title} <span className="text-cream/40">— {t.artist}</span>
                    {!playable && <span className="text-cream/25 text-xs"> · not on Spotify</span>}
                  </span>
                  {t.durationMs ? (
                    <span className="text-cream/30 text-xs flex-shrink-0">{formatDuration(t.durationMs)}</span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ol>

        <p className="mt-6 text-center text-xs text-cream/25 font-mono">
          made {new Date(mixtape.createdAt).toLocaleDateString()}
        </p>
      </div>

      {/* Actions */}
      <div className="mt-5 grid grid-cols-2 gap-3">
        <button
          onClick={() => router.push(`/mixtape/${mixtape.id}/remix`)}
          className="py-3 rounded-md border border-cream/25 text-cream/80 font-semibold uppercase tracking-wide text-sm hover:bg-cream/10 transition"
        >
          Remix
        </button>
        <button
          onClick={copyLink}
          className="py-3 rounded-md bg-cream text-ink font-semibold uppercase tracking-wide text-sm hover:bg-cream/90 transition"
        >
          {copied ? "Link copied ✓" : "Share"}
        </button>
      </div>

      <div className="mt-3 flex justify-center">
        <button
          onClick={exportImage}
          disabled={exporting}
          className="text-sm text-cream/50 hover:text-cream disabled:opacity-50 transition"
        >
          {exporting ? "Exporting…" : "or export as an image"}
        </button>
      </div>
    </main>
  );
}
