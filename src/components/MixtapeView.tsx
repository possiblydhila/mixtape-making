"use client";

import { useRef, useState } from "react";
import Link from "next/link";
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
  const [flipped, setFlipped] = useState(false);
  const [copied, setCopied] = useState(false);
  const [exporting, setExporting] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const { tracks, note } = mixtape;

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
    <main className="max-w-3xl mx-auto px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <Link href="/" className="text-sm text-cream/50 hover:text-cream">
          ← Make your own
        </Link>
        <div className="flex gap-2">
          <button
            onClick={copyLink}
            className="text-sm px-3 py-1.5 rounded-md border border-cream/25 hover:bg-cream/10"
          >
            {copied ? "Link copied ✓" : "Copy share link"}
          </button>
          <button
            onClick={exportImage}
            disabled={exporting}
            className="text-sm px-3 py-1.5 rounded-md bg-cream text-ink font-semibold hover:bg-cream/90 disabled:opacity-50"
          >
            {exporting ? "Exporting…" : "Export as image"}
          </button>
        </div>
      </div>

      <div ref={cardRef} className="rounded-2xl bg-[#1a1512] border border-cream/10 p-8">
        {(mixtape.fromName || mixtape.toName) && (
          <p className="text-center text-cream/50 text-sm mb-4 font-mono">
            {mixtape.toName && <>For <span className="text-cream">{mixtape.toName}</span></>}
            {mixtape.fromName && <> — from <span className="text-cream">{mixtape.fromName}</span></>}
          </p>
        )}

        <div className="max-w-md mx-auto">
          <Cassette
            cassette={mixtape.cassette}
            note={note}
            flipped={flipped}
            onFlip={note ? () => setFlipped((f) => !f) : undefined}
          />
        </div>

        {note && (
          <div className="mt-4 flex justify-center">
            <button
              onClick={() => setFlipped((f) => !f)}
              className="px-4 py-1.5 rounded-full text-sm border border-cream/25 text-cream/70 hover:text-cream hover:border-cream/40 transition"
            >
              {flipped ? "↩ Back to the tracklist" : "↪ Flip to read the note"}
            </button>
          </div>
        )}

        <ol className="mt-6 space-y-1 max-w-md mx-auto">
          {tracks.map((t, i) => (
            <li key={`${t.id}-${i}`} className="flex items-center gap-2 text-sm py-1 border-b border-cream/5">
              <span className="w-5 text-cream/40 flex-shrink-0">{i + 1}</span>
              <span className="flex-1 truncate">
                {t.title} <span className="text-cream/40">— {t.artist}</span>
              </span>
              {t.durationMs ? <span className="text-cream/30 text-xs">{formatDuration(t.durationMs)}</span> : null}
            </li>
          ))}
        </ol>

        <p className="mt-8 text-center text-xs text-cream/25 font-mono">
          made {new Date(mixtape.createdAt).toLocaleDateString()}
        </p>
      </div>
    </main>
  );
}
