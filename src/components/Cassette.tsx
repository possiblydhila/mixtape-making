"use client";

import type { CassetteStyle } from "@/lib/types";

export default function Cassette({
  cassette,
  side,
  spinning = false,
}: {
  cassette: CassetteStyle;
  side: "A" | "B";
  spinning?: boolean;
}) {
  const { shellColor, labelColor, reelColor, labelText, font } = cassette;
  const fontClass = font === "display" ? "font-display" : "font-mono";

  return (
    <svg
      viewBox="0 0 400 250"
      className="w-full h-auto drop-shadow-[0_15px_25px_rgba(0,0,0,0.45)]"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* shell */}
      <rect x="4" y="4" width="392" height="242" rx="16" fill={shellColor} stroke="#00000030" strokeWidth="2" />

      {/* screw holes */}
      {[[20, 20], [380, 20], [20, 230], [380, 230]].map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r="5" fill="#00000040" />
      ))}

      {/* label panel */}
      <rect x="30" y="24" width="340" height="130" rx="6" fill={labelColor} stroke="#00000025" strokeWidth="1.5" />

      {/* label text */}
      <text
        x="200"
        y="55"
        textAnchor="middle"
        className={fontClass}
        fontSize="26"
        fill="#221912"
        style={{ fontWeight: 700 }}
      >
        {labelText || "My Mixtape"}
      </text>
      <line x1="50" y1="68" x2="350" y2="68" stroke="#22191230" strokeWidth="1.5" />

      {/* side indicator lines styled like a handwritten tracklist hint */}
      <text x="50" y="90" fontSize="12" fill="#22191270" className="font-mono">
        SIDE {side}
      </text>
      <line x1="50" y1="100" x2="350" y2="100" stroke="#22191218" strokeWidth="1" />
      <line x1="50" y1="112" x2="350" y2="112" stroke="#22191218" strokeWidth="1" />
      <line x1="50" y1="124" x2="350" y2="124" stroke="#22191218" strokeWidth="1" />
      <line x1="50" y1="136" x2="270" y2="136" stroke="#22191218" strokeWidth="1" />

      {/* tape window */}
      <rect x="60" y="170" width="280" height="60" rx="6" fill="#0d0b09" />
      <rect x="60" y="170" width="280" height="60" rx="6" fill="#00000000" stroke="#00000040" strokeWidth="2" />

      {/* reels */}
      {[130, 270].map((cx, i) => (
        <g key={i} className={spinning ? "reel-spin" : ""} style={{ transformOrigin: `${cx}px 200px` }}>
          <circle cx={cx} cy="200" r="26" fill="#1a1512" stroke="#00000060" strokeWidth="2" />
          <circle cx={cx} cy="200" r="10" fill={reelColor} />
          {[0, 60, 120, 180, 240, 300].map((deg) => (
            <rect
              key={deg}
              x={cx - 2}
              y={200 - 22}
              width="4"
              height="10"
              fill="#0d0b09"
              transform={`rotate(${deg} ${cx} 200)`}
            />
          ))}
        </g>
      ))}

      {/* tape between reels */}
      <path d="M 152 200 Q 200 214 248 200" stroke="#3a2f26" strokeWidth="4" fill="none" />

      {/* bottom screws / grip lines */}
      <text x="350" y="245" textAnchor="end" fontSize="9" fill="#f4ecd860" className="font-mono">
        HI-FI STEREO
      </text>
    </svg>
  );
}
