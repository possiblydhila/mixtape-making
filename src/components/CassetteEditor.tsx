"use client";

import type { CassetteStyle } from "@/lib/types";

const SHELL_COLORS = ["#e8533f", "#3f6fe8", "#2ea36b", "#1a1a1a", "#e8c93f", "#8b5fbf", "#e88ac0"];
const LABEL_COLORS = ["#f4ecd8", "#ffffff", "#fce9c9", "#e9dcc9", "#f0d9d9"];

export default function CassetteEditor({
  cassette,
  onChange,
}: {
  cassette: CassetteStyle;
  onChange: (next: CassetteStyle) => void;
}) {
  function update<K extends keyof CassetteStyle>(key: K, value: CassetteStyle[K]) {
    onChange({ ...cassette, [key]: value });
  }

  return (
    <div className="space-y-5">
      <div>
        <label className="text-xs uppercase tracking-wide text-cream/60">Mixtape title (on the label)</label>
        <input
          value={cassette.labelText}
          onChange={(e) => update("labelText", e.target.value)}
          maxLength={30}
          placeholder="Songs For You"
          className="mt-1 w-full rounded-md bg-black/30 border border-cream/15 px-3 py-2 text-cream placeholder:text-cream/30 focus:outline-none focus:border-cream/40"
        />
      </div>

      <div>
        <span className="text-xs uppercase tracking-wide text-cream/60">Shell color</span>
        <div className="mt-2 flex flex-wrap gap-2">
          {SHELL_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => update("shellColor", c)}
              className={`w-8 h-8 rounded-full border-2 ${
                cassette.shellColor === c ? "border-cream scale-110" : "border-transparent"
              } transition`}
              style={{ backgroundColor: c }}
              aria-label={`shell color ${c}`}
            />
          ))}
          <input
            type="color"
            value={cassette.shellColor}
            onChange={(e) => update("shellColor", e.target.value)}
            className="w-8 h-8 rounded-full overflow-hidden border border-cream/30 bg-transparent"
            title="Custom color"
          />
        </div>
      </div>

      <div>
        <span className="text-xs uppercase tracking-wide text-cream/60">Label color</span>
        <div className="mt-2 flex flex-wrap gap-2">
          {LABEL_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => update("labelColor", c)}
              className={`w-8 h-8 rounded-full border-2 ${
                cassette.labelColor === c ? "border-cream scale-110" : "border-transparent"
              } transition`}
              style={{ backgroundColor: c }}
              aria-label={`label color ${c}`}
            />
          ))}
        </div>
      </div>

      <div>
        <span className="text-xs uppercase tracking-wide text-cream/60">Reel color</span>
        <div className="mt-2 flex flex-wrap gap-2">
          {["#f4ecd8", "#e8533f", "#3f6fe8", "#2ea36b", "#e8c93f"].map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => update("reelColor", c)}
              className={`w-8 h-8 rounded-full border-2 ${
                cassette.reelColor === c ? "border-cream scale-110" : "border-transparent"
              } transition`}
              style={{ backgroundColor: c }}
              aria-label={`reel color ${c}`}
            />
          ))}
        </div>
      </div>

      <div>
        <span className="text-xs uppercase tracking-wide text-cream/60">Label font</span>
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={() => update("font", "display")}
            className={`px-3 py-1.5 rounded-md border text-sm font-display text-lg ${
              cassette.font === "display" ? "border-cream bg-cream/10" : "border-cream/20"
            }`}
          >
            Handwritten
          </button>
          <button
            type="button"
            onClick={() => update("font", "mono")}
            className={`px-3 py-1.5 rounded-md border text-sm font-mono ${
              cassette.font === "mono" ? "border-cream bg-cream/10" : "border-cream/20"
            }`}
          >
            Typewriter
          </button>
        </div>
      </div>
    </div>
  );
}
