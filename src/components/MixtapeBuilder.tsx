"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Cassette from "@/components/Cassette";
import TrackAdder from "@/components/TrackAdder";
import TrackList from "@/components/TrackList";
import StepProgress from "@/components/builder/StepProgress";
import ColorSwatches from "@/components/builder/ColorSwatches";
import type { CassetteStyle, Mixtape, Track } from "@/lib/types";

const SHELL_COLORS = ["#e8533f", "#3f6fe8", "#2ea36b", "#1a1a1a", "#e8c93f", "#8b5fbf", "#e88ac0"];
const REEL_COLORS = ["#f4ecd8", "#e8533f", "#3f6fe8", "#2ea36b", "#e8c93f"];
const NOTE_COLORS = ["#f4ecd8", "#ffffff", "#fce9c9", "#e9dcc9", "#f0d9d9"];

const DEFAULT_CASSETTE: CassetteStyle = {
  shellColor: "#e8533f",
  labelColor: "#f4ecd8",
  reelColor: "#f4ecd8",
  labelText: "My Mixtape",
  font: "display",
};

const TOTAL_STEPS = 4;

const STEP_HEADINGS = [
  "How should your cassette look?",
  "Curate the songs!",
  "Say what you wanna say here",
  "Who's this mixtape for?",
];

export default function MixtapeBuilder({ seed }: { seed?: Mixtape }) {
  const router = useRouter();

  const [step, setStep] = useState(1);

  // `seed` (a "remix") pre-fills the wizard from an existing tape, but saving
  // always creates a brand-new mixtape — the original is never touched.
  const [cassette, setCassette] = useState<CassetteStyle>(
    seed
      ? { ...seed.cassette, labelText: seed.cassette.labelText || seed.title }
      : DEFAULT_CASSETTE
  );
  const [note, setNote] = useState(seed?.note ?? "");
  const [tracks, setTracks] = useState<Track[]>(seed?.tracks ?? []);
  const [fromName, setFromName] = useState(seed?.fromName ?? "");
  const [toName, setToName] = useState(seed?.toName ?? "");

  // The cassette back (note) is shown by default on the note step; the toggle
  // still lets you flip the preview over on any step.
  const [flipped, setFlipped] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  function update<K extends keyof CassetteStyle>(key: K, value: CassetteStyle[K]) {
    setCassette((prev) => ({ ...prev, [key]: value }));
  }

  function goToStep(next: number) {
    const clamped = Math.max(1, Math.min(TOTAL_STEPS, next));
    setStep(clamped);
    setFlipped(clamped === 3); // note step shows the back by default
  }

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
      const nextTracks = [...prev];
      const target = index + dir;
      if (target < 0 || target >= nextTracks.length) return prev;
      [nextTracks[index], nextTracks[target]] = [nextTracks[target], nextTracks[index]];
      return nextTracks;
    });
  }

  async function save() {
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch("/api/mixtapes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: cassette.labelText,
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

  const noSongs = tracks.length === 0;

  return (
    <main className="max-w-md mx-auto px-4 py-8">
      <StepProgress current={step} total={TOTAL_STEPS} />

      {/* Live cassette preview — shown on every step per the wireframe */}
      <div className="mt-6">
        <Cassette
          cassette={cassette}
          note={note}
          flipped={flipped}
          spinning
          onFlip={() => setFlipped((f) => !f)}
        />
        <div className="mt-3 flex justify-center">
          <button
            type="button"
            onClick={() => setFlipped((f) => !f)}
            className="px-4 py-1.5 rounded-full text-sm border border-cream/25 text-cream/70 hover:text-cream hover:border-cream/40 transition"
          >
            tap to flip &amp; read the note
          </button>
        </div>
      </div>

      <h1 className="mt-8 mb-4 text-lg font-semibold text-cream">{STEP_HEADINGS[step - 1]}</h1>

      {/* Step 1 — design the cassette */}
      {step === 1 && (
        <div className="space-y-5">
          <div>
            <label className="text-xs uppercase tracking-wide text-cream/60">Mix&apos;s title</label>
            <input
              value={cassette.labelText}
              onChange={(e) => update("labelText", e.target.value)}
              maxLength={30}
              placeholder="Songs For You"
              className="mt-1 w-full rounded-md bg-black/30 border border-cream/15 px-3 py-2 text-cream placeholder:text-cream/30 focus:outline-none focus:border-cream/40"
            />
          </div>

          <div>
            <span className="text-xs uppercase tracking-wide text-cream/60">Font</span>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={() => update("font", "display")}
                className={`px-4 py-2 rounded-md border font-display text-lg ${
                  cassette.font === "display" ? "border-cream bg-cream/10" : "border-cream/20"
                }`}
              >
                Handwritten
              </button>
              <button
                type="button"
                onClick={() => update("font", "mono")}
                className={`px-4 py-2 rounded-md border text-sm font-mono ${
                  cassette.font === "mono" ? "border-cream bg-cream/10" : "border-cream/20"
                }`}
              >
                Typewriter
              </button>
            </div>
          </div>

          <ColorSwatches
            label="Shell color"
            colors={SHELL_COLORS}
            value={cassette.shellColor}
            onChange={(c) => update("shellColor", c)}
            allowCustom
          />
          <ColorSwatches
            label="Reel color"
            colors={REEL_COLORS}
            value={cassette.reelColor}
            onChange={(c) => update("reelColor", c)}
          />
        </div>
      )}

      {/* Step 2 — songs */}
      {step === 2 && (
        <div className="space-y-4">
          <TrackAdder onAdd={addTrack} onAddMany={addManyTracks} />
          <div>
            <p className="text-sm uppercase tracking-wide text-cream/60 mb-2">
              Songlist {tracks.length > 0 && <span className="text-cream/40">({tracks.length})</span>}
            </p>
            <TrackList tracks={tracks} onRemove={removeTrack} onMove={moveTrack} />
          </div>
        </div>
      )}

      {/* Step 3 — note */}
      {step === 3 && (
        <div className="space-y-5">
          <div>
            <label className="text-xs uppercase tracking-wide text-cream/60">Note</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={5}
              maxLength={800}
              placeholder="Write something for the person you're sending this to..."
              className="mt-1 w-full rounded-md bg-black/30 border border-cream/15 px-3 py-2 text-sm placeholder:text-cream/30 focus:outline-none focus:border-cream/40 resize-none"
            />
            <p className="text-right text-xs text-cream/30 mt-1">{note.length}/800</p>
          </div>

          <ColorSwatches
            label="Note's color"
            colors={NOTE_COLORS}
            value={cassette.labelColor}
            onChange={(c) => update("labelColor", c)}
          />
        </div>
      )}

      {/* Step 4 — recipient */}
      {step === 4 && (
        <div className="space-y-4">
          <div>
            <label className="text-xs uppercase tracking-wide text-cream/60">From</label>
            <input
              value={fromName}
              onChange={(e) => setFromName(e.target.value)}
              placeholder="Your name"
              className="mt-1 w-full rounded-md bg-black/30 border border-cream/15 px-3 py-2 text-sm placeholder:text-cream/30 focus:outline-none focus:border-cream/40"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wide text-cream/60">To</label>
            <input
              value={toName}
              onChange={(e) => setToName(e.target.value)}
              placeholder="Their name"
              className="mt-1 w-full rounded-md bg-black/30 border border-cream/15 px-3 py-2 text-sm placeholder:text-cream/30 focus:outline-none focus:border-cream/40"
            />
          </div>

          {noSongs && (
            <p className="text-sm text-cream/50">
              You haven&apos;t added any songs yet.{" "}
              <button
                type="button"
                onClick={() => goToStep(2)}
                className="underline hover:text-cream"
              >
                Go back to add some
              </button>
              .
            </p>
          )}
          {saveError && <p className="text-sm text-red-400">{saveError}</p>}
        </div>
      )}

      {/* Footer nav */}
      <div className={`mt-8 gap-3 ${step === 1 ? "flex" : "grid grid-cols-2"}`}>
        {step > 1 && (
          <button
            type="button"
            onClick={() => goToStep(step - 1)}
            className="py-3 rounded-md border border-cream/25 text-cream/80 font-semibold hover:bg-cream/10 transition uppercase tracking-wide text-sm"
          >
            Back
          </button>
        )}
        {step < TOTAL_STEPS ? (
          <button
            type="button"
            onClick={() => goToStep(step + 1)}
            className="flex-1 py-3 rounded-md bg-cream text-ink font-semibold hover:bg-cream/90 transition uppercase tracking-wide text-sm"
          >
            Continue
          </button>
        ) : (
          <button
            type="button"
            onClick={save}
            disabled={saving || noSongs}
            className="py-3 rounded-md bg-cream text-ink font-semibold hover:bg-cream/90 disabled:opacity-40 transition uppercase tracking-wide text-sm"
          >
            {saving ? "Saving…" : "Create mix"}
          </button>
        )}
      </div>
    </main>
  );
}
