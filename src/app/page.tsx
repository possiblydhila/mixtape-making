"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Cassette from "@/components/Cassette";
import CassetteEditor from "@/components/CassetteEditor";
import TrackAdder from "@/components/TrackAdder";
import TrackList from "@/components/TrackList";
import type { CassetteStyle, Track } from "@/lib/types";

const DEFAULT_CASSETTE: CassetteStyle = {
  shellColor: "#e8533f",
  labelColor: "#f4ecd8",
  reelColor: "#f4ecd8",
  labelText: "My Mixtape",
  font: "display",
};

export default function HomePage() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [fromName, setFromName] = useState("");
  const [toName, setToName] = useState("");
  const [note, setNote] = useState("");
  const [cassette, setCassette] = useState<CassetteStyle>(DEFAULT_CASSETTE);

  const [flipped, setFlipped] = useState(false);
  const [tracks, setTracks] = useState<Track[]>([]);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  function addTrack(t: Track) {
    setTracks((prev) => [...prev, t]);
  }
  function addManyTracks(newTracks: Track[]) {
    setTracks((prev) => [...prev, ...newTracks]);
  }
  function removeTrack(index: number) {
    setTracks((prev) => prev.filter((_, i) => i !== index));
  }
  function moveTrack(index: number, dir: -1 | 1) {
    setTracks((prev) => {
      const next = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  async function saveMixtape() {
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch("/api/mixtapes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title || cassette.labelText,
          fromName,
          toName,
          note,
          cassette,
          tracks,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong");
      router.push(`/mixtape/${data.mixtape.id}`);
    } catch (err: any) {
      setSaveError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const totalTracks = tracks.length;

  return (
    <main className="max-w-6xl mx-auto px-4 py-10">
      <header className="mb-8 text-center">
        <h1 className="font-display text-5xl text-cream">Make a Mixtape</h1>
        <p className="text-cream/50 mt-1 text-sm">
          Customize the cassette, add songs, write a note — then share it with someone special.
        </p>
      </header>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Left: preview + cassette customization */}
        <div className="space-y-6">
          <div className="sticky top-6">
            <div className="rounded-xl p-6 bg-gradient-to-br from-cream/10 to-transparent border border-cream/10">
              <Cassette
                cassette={cassette}
                note={note}
                flipped={flipped}
                spinning
                onFlip={() => setFlipped((f) => !f)}
              />
            </div>

            <div className="mt-4 flex justify-center">
              <button
                onClick={() => setFlipped((f) => !f)}
                className="px-4 py-1.5 rounded-full text-sm border border-cream/25 text-cream/70 hover:text-cream hover:border-cream/40 transition"
              >
                {flipped ? "↩ Show the front" : "↪ Flip to the note"}
              </button>
            </div>

            <div className="mt-6 rounded-lg border border-cream/15 bg-black/20 p-5">
              <h2 className="text-sm uppercase tracking-wide text-cream/60 mb-4">Customize the cassette</h2>
              <CassetteEditor cassette={cassette} onChange={setCassette} />
            </div>
          </div>
        </div>

        {/* Right: songs + note + save */}
        <div className="space-y-6">
          <div className="rounded-lg border border-cream/15 bg-black/20 p-5 space-y-3">
            <h2 className="text-sm uppercase tracking-wide text-cream/60">Details</h2>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Mixtape title (defaults to label text)"
              className="w-full rounded-md bg-black/30 border border-cream/15 px-3 py-2 text-sm placeholder:text-cream/30 focus:outline-none focus:border-cream/40"
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                value={fromName}
                onChange={(e) => setFromName(e.target.value)}
                placeholder="From"
                className="w-full rounded-md bg-black/30 border border-cream/15 px-3 py-2 text-sm placeholder:text-cream/30 focus:outline-none focus:border-cream/40"
              />
              <input
                value={toName}
                onChange={(e) => setToName(e.target.value)}
                placeholder="To"
                className="w-full rounded-md bg-black/30 border border-cream/15 px-3 py-2 text-sm placeholder:text-cream/30 focus:outline-none focus:border-cream/40"
              />
            </div>
          </div>

          <div>
            <h2 className="text-sm uppercase tracking-wide text-cream/60 mb-2">
              Songs {tracks.length > 0 && <span className="text-cream/40">({tracks.length})</span>}
            </h2>
            <TrackAdder onAdd={addTrack} onAddMany={addManyTracks} />
            <div className="mt-3">
              <TrackList tracks={tracks} onRemove={removeTrack} onMove={moveTrack} />
            </div>
          </div>

          <div className="rounded-lg border border-cream/15 bg-black/20 p-5">
            <h2 className="text-sm uppercase tracking-wide text-cream/60 mb-1">A little note</h2>
            <p className="text-xs text-cream/40 mb-2">Shown on the back of the cassette — flip the preview to see it.</p>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={5}
              maxLength={800}
              placeholder="Write something for the person you're sending this to..."
              className="w-full rounded-md bg-black/30 border border-cream/15 px-3 py-2 text-sm placeholder:text-cream/30 focus:outline-none focus:border-cream/40 resize-none"
            />
            <p className="text-right text-xs text-cream/30 mt-1">{note.length}/800</p>
          </div>

          {saveError && <p className="text-sm text-red-400">{saveError}</p>}

          <button
            onClick={saveMixtape}
            disabled={saving || totalTracks === 0}
            className="w-full py-3 rounded-md bg-cream text-ink font-semibold hover:bg-cream/90 disabled:opacity-40 transition"
          >
            {saving ? "Saving…" : totalTracks === 0 ? "Add at least one song to save" : "Save & get share link"}
          </button>
        </div>
      </div>
    </main>
  );
}
