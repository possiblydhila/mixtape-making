"use client";

import type { CassetteStyle } from "@/lib/types";

/** The front face: a clean cassette with the mixtape title on the label. */
function CassetteFront({
  cassette,
  spinning,
}: {
  cassette: CassetteStyle;
  spinning: boolean;
}) {
  const { shellColor, labelColor, reelColor, labelText, font } = cassette;
  const fontClass = font === "display" ? "font-display" : "font-mono";

  return (
    <svg
      viewBox="0 0 400 250"
      className="w-full h-full drop-shadow-[0_15px_25px_rgba(0,0,0,0.45)]"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* shell */}
      <rect x="4" y="4" width="392" height="242" rx="16" fill={shellColor} stroke="#00000030" strokeWidth="2" />

      {/* screw holes */}
      {[[20, 20], [380, 20], [20, 230], [380, 230]].map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r="5" fill="#00000040" />
      ))}

      {/* label panel */}
      <rect x="30" y="24" width="340" height="122" rx="6" fill={labelColor} stroke="#00000025" strokeWidth="1.5" />

      {/* title, centered on the label */}
      <text
        x="200"
        y="92"
        textAnchor="middle"
        className={fontClass}
        fontSize="34"
        fill="#221912"
        style={{ fontWeight: 700 }}
      >
        {labelText || "My Mixtape"}
      </text>
      <line x1="70" y1="110" x2="330" y2="110" stroke="#22191220" strokeWidth="1.5" />

      {/* runtime marking, echoing a real cassette */}
      <text x="352" y="140" textAnchor="end" fontSize="13" fill="#22191280" className="font-mono" style={{ fontWeight: 700 }}>
        90 MIN
      </text>

      {/* tape window */}
      <rect x="60" y="168" width="280" height="62" rx="6" fill="#0d0b09" />
      <rect x="60" y="168" width="280" height="62" rx="6" fill="#00000000" stroke="#00000040" strokeWidth="2" />

      {/* reels */}
      {[130, 270].map((cx, i) => (
        <g key={i} className={spinning ? "reel-spin" : ""} style={{ transformOrigin: `${cx}px 199px` }}>
          <circle cx={cx} cy="199" r="26" fill="#1a1512" stroke="#00000060" strokeWidth="2" />
          <circle cx={cx} cy="199" r="10" fill={reelColor} />
          {[0, 60, 120, 180, 240, 300].map((deg) => (
            <rect
              key={deg}
              x={cx - 2}
              y={199 - 22}
              width="4"
              height="10"
              fill="#0d0b09"
              transform={`rotate(${deg} ${cx} 199)`}
            />
          ))}
        </g>
      ))}

      {/* tape between reels */}
      <path d="M 152 199 Q 200 213 248 199" stroke="#3a2f26" strokeWidth="4" fill="none" />

      <text x="60" y="245" fontSize="9" fill="#f4ecd860" className="font-mono">
        HI-FI STEREO
      </text>
    </svg>
  );
}

/** The back face: the handwritten note, revealed when the cassette is flipped. */
function CassetteBack({
  cassette,
  note,
}: {
  cassette: CassetteStyle;
  note: string;
}) {
  const { shellColor, labelColor } = cassette;

  return (
    <div
      className="w-full h-full rounded-2xl border-2 border-black/20 p-4 flex flex-col drop-shadow-[0_15px_25px_rgba(0,0,0,0.45)]"
      style={{ backgroundColor: shellColor }}
    >
      <div
        className="flex-1 rounded-md border border-black/15 p-4 flex flex-col overflow-hidden"
        style={{ backgroundColor: labelColor }}
      >
        <p className="text-[10px] uppercase tracking-[0.2em] text-ink/50 font-mono mb-1 flex-shrink-0">Note</p>
        <div className="flex-1 overflow-y-auto">
          <p className="font-display text-ink text-xl sm:text-2xl leading-snug whitespace-pre-wrap break-words">
            {note?.trim() || "Flip me back over…"}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function Cassette({
  cassette,
  note = "",
  flipped = false,
  spinning = false,
  onFlip,
}: {
  cassette: CassetteStyle;
  note?: string;
  flipped?: boolean;
  spinning?: boolean;
  onFlip?: () => void;
}) {
  const interactive = typeof onFlip === "function";

  return (
    <div className="flip-scene w-full">
      <div
        className={`flip-card ${flipped ? "is-flipped" : ""} ${interactive ? "cursor-pointer" : ""}`}
        style={{ aspectRatio: "400 / 250" }}
        {...(interactive
          ? {
              role: "button",
              tabIndex: 0,
              "aria-label": flipped ? "Flip to the front of the cassette" : "Flip to read the note",
              onClick: onFlip,
              onKeyDown: (e: React.KeyboardEvent) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onFlip?.();
                }
              },
            }
          : {})}
      >
        <div className="flip-face">
          <CassetteFront cassette={cassette} spinning={spinning && !flipped} />
        </div>
        <div className="flip-face flip-face--back">
          <CassetteBack cassette={cassette} note={note} />
        </div>
      </div>
    </div>
  );
}
