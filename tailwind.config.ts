import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        cream: "#f4ecd8",
        ink: "#221912",
      },
      fontFamily: {
        mono: ["'Space Mono'", "'JetBrains Mono'", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
        display: ["'Caveat'", "'Segoe Print'", "'Bradley Hand'", "cursive"],
      },
      boxShadow: {
        tape: "0 10px 30px rgba(0,0,0,0.35)",
      },
    },
  },
  plugins: [],
};
export default config;
