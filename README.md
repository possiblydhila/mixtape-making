# Mixtape

Make a customizable cassette mixtape, add songs by searching Spotify, pasting a
Spotify playlist link, or typing them in manually, write a note, and share it
with someone special via a link or an exported image.

## Features

- **Customize the cassette** — shell color, label color, reel color, label text, font (handwritten or typewriter), Side A / Side B.
- **Add songs three ways** — search the Spotify catalog, paste a Spotify playlist URL to bulk-import its tracks, or add a song manually by title/artist.
- **Write a note** — a short message attached to the mixtape, styled like a handwritten card.
- **Share** — every saved mixtape gets a permanent link (`/mixtape/[id]`) you can send to anyone, plus a one-click "export as image" button that downloads a shareable PNG card.

## Setup

1. Install dependencies:
   ```
   npm install
   ```
2. Create a Spotify app at https://developer.spotify.com/dashboard, then copy `.env.example` to `.env.local` and fill in your credentials:
   ```
   cp .env.example .env.local
   ```
   ```
   SPOTIFY_CLIENT_ID=...
   SPOTIFY_CLIENT_SECRET=...
   ```
   No redirect URI or user login is needed — this app uses Spotify's Client Credentials flow (server-side only) for search and public playlist import.
3. Run the dev server:
   ```
   npm run dev
   ```
   Open http://localhost:3000.

## How it's built

- **Next.js 14 (App Router) + TypeScript + Tailwind CSS**
- `src/lib/spotify.ts` — Spotify Client Credentials token exchange, track search, and playlist track fetching (with pagination).
- `src/app/api/spotify/search` and `src/app/api/spotify/playlist` — API routes the frontend calls (keeps your Spotify secret server-side only).
- `src/lib/store.ts` — a simple JSON-file store (`data/mixtapes.json`) for saved mixtapes. Swap this for Postgres/SQLite/etc. if you need multi-user scale or to deploy on a read-only filesystem (e.g. Vercel's serverless functions can't write to disk — see "Deploying" below).
- `src/components/Cassette.tsx` — the SVG cassette that renders live as you customize it.
- `src/app/mixtape/[id]` — the shareable view page, plus PNG export via `html-to-image`.

## Deploying

The JSON file store writes to the local filesystem, which works great for `npm run start` on a normal server or VM, but **not** on platforms with read-only/ephemeral filesystems (e.g. Vercel serverless). For those, swap `src/lib/store.ts` for a hosted DB (Postgres via Supabase/Neon, Turso/SQLite, etc.) — the function signatures (`createMixtape`, `getMixtape`, `listMixtapes`) are the only thing the rest of the app depends on, so this is a self-contained swap.

## Notes

- Track search and playlist import only require your Spotify Client ID/Secret — no end-user Spotify login is needed since it only reads public catalog/playlist data.
- Manually-added songs (no Spotify match) still work everywhere — they just won't have album art or a duration.
