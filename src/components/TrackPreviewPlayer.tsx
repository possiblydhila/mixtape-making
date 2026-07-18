"use client";

import { useEffect, useRef, useState } from "react";
import type { Track } from "@/lib/types";

let activeAudio: HTMLAudioElement | null = null;

function stopOtherPreviews(current: HTMLAudioElement) {
  if (activeAudio && activeAudio !== current) {
    activeAudio.pause();
    activeAudio.currentTime = 0;
  }
  activeAudio = current;
}

function formatDuration(ms?: number) {
  if (!ms) return "";
  const totalSec = Math.round(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, "0")}`;
}

export default function TrackPreviewPlayer({
  track,
  variant = "card",
  autoPlay = false,
  onAdd,
  addLabel = "Add to mixtape",
  onPlayingChange,
}: {
  track: Track;
  variant?: "card" | "inline";
  autoPlay?: boolean;
  onAdd?: () => void;
  addLabel?: string;
  onPlayingChange?: (playing: boolean) => void;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [previewDuration, setPreviewDuration] = useState(30);

  const hasPreview = Boolean(track.previewUrl);
  const canEmbed = track.source === "spotify" && track.id && !track.id.startsWith("manual-");

  useEffect(() => {
    setPlaying(false);
    setProgress(0);
    onPlayingChange?.(false);

    const audio = audioRef.current;
    if (!audio || !track.previewUrl) return;

    audio.src = track.previewUrl;
    audio.load();

    if (autoPlay) {
      stopOtherPreviews(audio);
      audio
        .play()
        .then(() => {
          setPlaying(true);
          onPlayingChange?.(true);
        })
        .catch(() => {});
    }
  }, [track.id, track.previewUrl, autoPlay, onPlayingChange]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTime = () => {
      setProgress(audio.currentTime);
      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        setPreviewDuration(audio.duration);
      }
    };
    const onEnd = () => {
      setPlaying(false);
      onPlayingChange?.(false);
    };

    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("ended", onEnd);
    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("ended", onEnd);
    };
  }, [onPlayingChange]);

  function togglePlay() {
    const audio = audioRef.current;
    if (!audio || !track.previewUrl) return;

    if (playing) {
      audio.pause();
      setPlaying(false);
      onPlayingChange?.(false);
      return;
    }

    stopOtherPreviews(audio);
    audio
      .play()
      .then(() => {
        setPlaying(true);
        onPlayingChange?.(true);
      })
      .catch(() => {});
  }

  if (variant === "inline") {
    return (
      <>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            togglePlay();
          }}
          disabled={!hasPreview}
          title={hasPreview ? (playing ? "Pause preview" : "Play preview") : "Preview not available"}
          className="w-7 h-7 rounded-full flex items-center justify-center bg-cream/10 hover:bg-cream/20 disabled:opacity-30 flex-shrink-0 transition"
          aria-label={playing ? "Pause preview" : "Play preview"}
        >
          {playing ? (
            <span className="text-[10px]">❚❚</span>
          ) : (
            <span className="text-[10px] ml-0.5">▶</span>
          )}
        </button>
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <audio ref={audioRef} preload="none" className="hidden" />
      </>
    );
  }

  const progressPct = previewDuration > 0 ? (progress / previewDuration) * 100 : 0;

  return (
    <div className="rounded-xl overflow-hidden border border-cream/15 bg-gradient-to-b from-cream/10 via-black/30 to-black/50">
      <div className="relative aspect-square max-h-56 mx-auto w-full bg-black/40">
        {track.albumArt ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={track.albumArt} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-cream/20 text-5xl">♪</div>
        )}

        {hasPreview && (
          <button
            type="button"
            onClick={togglePlay}
            className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/30 transition group"
            aria-label={playing ? "Pause preview" : "Play preview"}
          >
            <span className="w-14 h-14 rounded-full bg-cream/90 text-ink flex items-center justify-center shadow-lg group-hover:scale-105 transition">
              {playing ? (
                <span className="text-sm">❚❚</span>
              ) : (
                <span className="text-sm ml-1">▶</span>
              )}
            </span>
          </button>
        )}
      </div>

      <div className="p-4 space-y-3">
        <div>
          <p className="font-semibold text-base truncate">{track.title}</p>
          <p className="text-sm text-cream/60 truncate">
            {track.artist}
            {track.durationMs ? ` · ${formatDuration(track.durationMs)}` : ""}
          </p>
          {track.album && <p className="text-xs text-cream/40 truncate mt-0.5">{track.album}</p>}
        </div>

        {hasPreview ? (
          <div className="space-y-1">
            <div className="h-1 rounded-full bg-cream/10 overflow-hidden">
              <div
                className="h-full bg-cream/70 rounded-full transition-[width] duration-100"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <p className="text-[10px] text-cream/40 uppercase tracking-wide">30-second preview</p>
          </div>
        ) : canEmbed ? (
          <div className="rounded-lg overflow-hidden bg-black/40">
            <iframe
              title={`Preview ${track.title}`}
              src={`https://open.spotify.com/embed/track/${track.id}?utm_source=generator&theme=0`}
              width="100%"
              height="152"
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy"
              className="border-0"
            />
          </div>
        ) : (
          <p className="text-xs text-cream/40 italic">No audio preview available for this track.</p>
        )}

        <div className="flex gap-2 pt-1">
          {onAdd && (
            <button
              type="button"
              onClick={onAdd}
              className="flex-1 py-2.5 rounded-md bg-cream text-ink text-sm font-semibold hover:bg-cream/90 transition"
            >
              {addLabel}
            </button>
          )}
          {track.spotifyUrl && (
            <a
              href={track.spotifyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-2.5 rounded-md border border-cream/20 text-sm text-cream/70 hover:text-cream hover:border-cream/40 transition"
            >
              Spotify
            </a>
          )}
        </div>
      </div>

      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio ref={audioRef} preload="metadata" className="hidden" />
    </div>
  );
}
