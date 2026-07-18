"use client";

import { useState } from "react";
import type { Track } from "@/lib/types";
import TrackPreviewPlayer from "@/components/TrackPreviewPlayer";

function formatDuration(ms?: number) {
  if (!ms) return "";
  const totalSec = Math.round(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, "0")}`;
}

export default function TrackList({
  tracks,
  onRemove,
  onMove,
}: {
  tracks: Track[];
  onRemove: (index: number) => void;
  onMove: (index: number, direction: -1 | 1) => void;
}) {
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);

  if (tracks.length === 0) {
    return (
      <p className="text-sm text-cream/40 italic py-6 text-center border border-dashed border-cream/15 rounded-lg">
        No tracks yet — search Spotify, paste a playlist, or add one manually.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {previewIndex !== null && tracks[previewIndex] && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-cream/40 uppercase tracking-wide">Now previewing</p>
            <button
              type="button"
              onClick={() => setPreviewIndex(null)}
              className="text-xs text-cream/50 hover:text-cream"
            >
              Close
            </button>
          </div>
          <TrackPreviewPlayer track={tracks[previewIndex]} autoPlay />
        </div>
      )}

      <ol className="space-y-1">
        {tracks.map((t, i) => {
          const isPreviewing = previewIndex === i;
          return (
            <li
              key={`${t.id}-${i}`}
              className={`flex items-center gap-2 rounded-md px-2 py-2 border transition ${
                isPreviewing
                  ? "bg-cream/10 border-cream/25"
                  : "bg-black/20 border-cream/10 hover:border-cream/20"
              }`}
            >
              <span className="w-5 text-xs text-cream/40 flex-shrink-0">{i + 1}</span>
              {t.albumArt && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={t.albumArt} alt="" className="w-9 h-9 rounded object-cover flex-shrink-0" />
              )}
              <button
                type="button"
                onClick={() => setPreviewIndex(isPreviewing ? null : i)}
                className="min-w-0 flex-1 text-left"
              >
                <p className="text-sm truncate">{t.title}</p>
                <p className="text-xs text-cream/50 truncate">{t.artist}</p>
              </button>
              <TrackPreviewPlayer track={t} variant="inline" />
              {t.durationMs && (
                <span className="text-xs text-cream/40 flex-shrink-0 hidden sm:inline">
                  {formatDuration(t.durationMs)}
                </span>
              )}
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => onMove(i, -1)}
                  disabled={i === 0}
                  className="w-6 h-6 rounded hover:bg-cream/10 disabled:opacity-20 text-xs"
                  aria-label="Move up"
                >
                  ↑
                </button>
                <button
                  onClick={() => onMove(i, 1)}
                  disabled={i === tracks.length - 1}
                  className="w-6 h-6 rounded hover:bg-cream/10 disabled:opacity-20 text-xs"
                  aria-label="Move down"
                >
                  ↓
                </button>
                <button
                  onClick={() => {
                    if (previewIndex === i) setPreviewIndex(null);
                    else if (previewIndex !== null && previewIndex > i) {
                      setPreviewIndex(previewIndex - 1);
                    }
                    onRemove(i);
                  }}
                  className="w-6 h-6 rounded hover:bg-red-500/20 text-xs text-red-400"
                  aria-label="Remove"
                >
                  ✕
                </button>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
