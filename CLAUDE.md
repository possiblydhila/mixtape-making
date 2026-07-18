# Mixtape App — Claude context

Make a customizable virtual cassette mixtape: design the cassette, add songs
(Spotify search / paste a playlist / manual), write a note, save, and share via a
permanent link or PNG export. No user login.

**Read [docs/PRD.md](docs/PRD.md) first** — it's the living product spec (features,
data model, API surface, constraints, roadmap). Keep it current: when you change a
feature, update the relevant section and add a Changelog entry.

## Stack
- Next.js 14 (App Router) + React 18 + TypeScript + Tailwind CSS
- Spotify Web API via Client Credentials flow (server-side only)
- JSON file store at `data/mixtapes.json` (not safe for serverless/concurrent writes)
- `html-to-image` for PNG export; `nanoid` for ids

## Where things live
- `src/lib/types.ts` — `Track`, `CassetteStyle`, `Mixtape`
- `src/lib/spotify.ts` — token cache, `searchTracks`, `getPlaylistTracks`, `extractPlaylistId`
- `src/lib/store.ts` — `createMixtape` / `getMixtape` / `listMixtapes` (swap this module for a real DB)
- `src/components/` — `Cassette`, `CassetteEditor`, `TrackAdder`, `TrackList`, `TrackPreviewPlayer`, `MixtapeView`
- `src/app/api/` — `mixtapes`, `mixtapes/[id]`, `spotify/search`, `spotify/playlist`
- `src/app/page.tsx` — builder; `src/app/mixtape/[id]/` — share view

## Commands
- `npm run dev` — dev server at http://localhost:3000
- `npm run build` / `npm run start` / `npm run lint`

## Setup
Copy `.env.example` → `.env.local` and set `SPOTIFY_CLIENT_ID` / `SPOTIFY_CLIENT_SECRET`
(and `NEXT_PUBLIC_BASE_URL` for share links).

## Notes
- Create-only today: no edit/delete, no listing UI (`listMixtapes` is unused).
- Manual tracks have no album art / duration / preview.
- Anyone with a link can view; ids are unguessable but not access-controlled.
