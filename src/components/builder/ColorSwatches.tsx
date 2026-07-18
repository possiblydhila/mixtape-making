"use client";

/**
 * A labelled row of color swatches. Used across the builder for Shell, Reel,
 * and Note ("label") colors. Pass `allowCustom` to append a native picker.
 */
export default function ColorSwatches({
  label,
  colors,
  value,
  onChange,
  allowCustom = false,
}: {
  label: string;
  colors: string[];
  value: string;
  onChange: (color: string) => void;
  allowCustom?: boolean;
}) {
  return (
    <div>
      <span className="text-xs uppercase tracking-wide text-cream/60">{label}</span>
      <div className="mt-2 flex flex-wrap gap-2">
        {colors.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => onChange(c)}
            className={`w-9 h-9 rounded-full border-2 ${
              value === c ? "border-cream scale-110" : "border-transparent"
            } transition`}
            style={{ backgroundColor: c }}
            aria-label={`${label} ${c}`}
          />
        ))}
        {allowCustom && (
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-9 h-9 rounded-full overflow-hidden border border-cream/30 bg-transparent"
            title="Custom color"
          />
        )}
      </div>
    </div>
  );
}
