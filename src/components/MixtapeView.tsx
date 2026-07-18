"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Cassette from "@/components/Cassette";
import type { Mixtape } from "@/lib/types";

function formatDuration(ms?: number) {
  if (!ms) return "";
  const totalSec = Math.round(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, "0")}`;
}

export default function MixtapeView({ mixtape }: { mixtape: Mixtape }) {
  const router = useRouter();
  const { tracks, note } = mixtape;

  const [flipped, setFlipped] = useState(false);
  const [copied, setCopied] = useState(false);
  const [exporting, setExporting] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // Tracklist transport (30s previews)
  const anyPreview = tracks.some((t) => t.previewUrl);
  const firstPlayable = tracks.findIndex((t) => t.previewUrl);
  const [currentIndex, setCurrentIndex] = useState(firstPlayable === -1 ? 0 : firstPlayable);
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const currentTrack = tracks[currentIndex];
  const currentHasPreview = Boolean(currentTrack?.previewUrl);

  function findPlayable(from: number, dir: 1 | -1) {
    for (let i = from; i >= 0 && i < tracks.length; i += dir) {
      if (tracks[i]?.previewUrl) return i;
    }
    return -1;
  }
  const hasNext = findPlayable(currentIndex + 1, 1) !== -1;
  const hasPrev = findPlayable(currentIndex - 1, -1) !== -1;

  function playIndex(index: number) {
    const audio = audioRef.current;
    const track = tracks[index];
    if (!audio || !track?.previewUrl) {
      setPlaying(false);
      return;
    }
    if (audio.src !== track.previewUrl) audio.src = track.previewUrl;
    audio
      .play()
      .then(() => setPlaying(true))
      .catch(() => setPlaying(false));
  }

  function togglePlay() {
    const audio = audioRef.current;
    if (!audio || !currentHasPreview) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      playIndex(currentIndex);
    }
  }

  function skip(dir: 1 | -1) {
    const next = findPlayable(currentIndex + dir, dir);
    if (next === -1) return;
    setCurrentIndex(next);
    playIndex(next);
  }

  function selectTrack(index: number) {
    setCurrentIndex(index);
    if (tracks[index]?.previewUrl) playIndex(index);
    else {
      audioRef.current?.pause();
      setPlaying(false);
    }
  }

  // Auto-advance to the next previewable track when one finishes.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onEnded = () => {
      const next = findPlayable(currentIndex + 1, 1);
      if (next === -1) {
        setPlaying(false);
        return;
      }
      setCurrentIndex(next);
      playIndex(next);
    };
    audio.addEventListener("ended", onEnded);
    return () => audio.removeEventListener("ended", onEnded);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, tracks]);

  // Pause playback when leaving the page.
  useEffect(() => {
    const audio = audioRef.current;
    return () => audio?.pause();
  }, []);

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
    // The note lives on the back of the cassette; make sure we capture the front.
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
        {anyPreview && (
          <div className="mt-6 grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => skip(-1)}
              disabled={!hasPrev}
              className="py-3 rounded-md border border-cream/25 text-cream/80 font-semibold uppercase tracking-wide text-sm hover:bg-cream/10 disabled:opacity-30 transition"
            >
              Prev
            </button>
            <button
              type="button"
              onClick={togglePlay}
              disabled={!currentHasPreview}
              className="py-3 rounded-md bg-cream text-ink font-semibold uppercase tracking-wide text-sm hover:bg-cream/90 disabled:opacity-40 transition"
            >
              {playing ? "Pause" : "Play"}
            </button>
            <button
              type="button"
              onClick={() => skip(1)}
              disabled={!hasNext}
              className="py-3 rounded-md border border-cream/25 text-cream/80 font-semibold uppercase tracking-wide text-sm hover:bg-cream/10 disabled:opacity-30 transition"
            >
              Next
            </button>
          </div>
        )}

        {/* Songlist */}
        <ol className="mt-5 space-y-1">
          {tracks.map((t, i) => {
            const isCurrent = i === currentIndex;
            return (
              <li key={`${t.id}-${i}`}>
                <button
                  type="button"
                  onClick={() => selectTrack(i)}
                  className={`w-full flex items-center gap-2 text-sm rounded-md px-2 py-2 text-left transition border ${
                    isCurrent
                      ? "bg-cream/10 border-cream/25"
                      : "border-transparent hover:bg-cream/5"
                  }`}
                >
                  <span className="w-5 text-cream/40 flex-shrink-0">
                    {isCurrent && playing ? "♪" : i + 1}
                  </span>
                  <span className="flex-1 truncate">
                    {t.title} <span className="text-cream/40">— {t.artist}</span>
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

      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio ref={audioRef} preload="none" className="hidden" />
    </main>
  );
}
