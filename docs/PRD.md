# Mixtape — Product Requirements Document

> Living document. It describes what the Mixtape app **is today** (as built) and
> serves as the shared context for planning and shipping future changes. When you
> add or change a feature, update the relevant section and add an entry to the
> [Changelog](#changelog).

- **Status:** In active development (v0.2.0)
- **Last updated:** 2026-07-19
- **Owner:** developer@ultravoucher.co.id

---

## 1. Overview

### 1.1 What it is
Mixtape is a web app for making a **customizable virtual cassette mixtape** for
someone. A creator designs a single-sided cassette (colors, label, font) whose front
shows the mixtape title, fills it with songs (via Spotify search, a pasted Spotify
playlist, or manual entry), writes a short handwritten-style note that appears on the
**back** of the cassette (flip to read it), and saves it. Every saved mixtape gets a
permanent, shareable link and can be exported as a PNG card.

### 1.2 Vision & tone
Recreate the sentimental, tactile ritual of making a mixtape for someone special —
warm, personal, low-friction, no account required. Aesthetic is retro/analog: cream
on dark, a live SVG cassette with spinning reels, handwritten (Caveat) and typewriter
(Space Mono) fonts.

### 1.3 Non-goals (current)
- Not a music streaming/playback product — audio is limited to 30-second Spotify
  previews (or an embed fallback).
- No user accounts, auth, or private/ownership model (anyone with the link can view).
- No editing of a mixtape after it's saved (create-only today).
- Not built for high-scale multi-tenant use (single JSON file store).

---

## 2. Users & core flow

### 2.1 Personas
- **Creator** — makes a mixtape for a friend/partner. Primary user; the whole build
  experience is for them.
- **Recipient** — opens a shared link to view the mixtape, flip the cassette to read
  the note, preview tracks, and see the tracklist. Read-only.

### 2.2 Primary flow (creator)
1. Land on `/` ("Make a Mixtape").
2. Customize the cassette (live preview updates as you edit; flip it to preview the note on the back).
3. Add songs three ways, reorder/remove/preview them.
4. Fill in details (title, From, To) and write a note (rendered on the cassette back).
5. Save → redirected to `/mixtape/[id]` (the shareable view).
6. Copy the link or export a PNG to send.

### 2.3 Recipient flow
1. Open `/mixtape/[id]`.
2. See the cassette front (title), From/To line, and the tracklist. Flip the cassette
   to read the note on the back.
3. Optionally preview tracks, copy the link, or export the card as an image.
4. CTA to "Make your own" links back to `/`.

---

## 3. Architecture & tech stack

| Concern | Choice |
|---|---|
| Framework | Next.js 14 (App Router) + React 18 + TypeScript |
| Styling | Tailwind CSS (custom `cream`/`ink` colors, `display`/`mono` fonts, `tape` shadow) |
| Music data | Spotify Web API via **Client Credentials** flow (server-side only, no user login) |
| Persistence | JSON file store at `data/mixtapes.json` (`src/lib/store.ts`) |
| ID generation | `nanoid(10)` |
| Image export | `html-to-image` (`toPng`), dynamically imported client-side |
| Rendering | Cassette is inline SVG (`Cassette.tsx`); reels animate via CSS `spin` keyframe |

### 3.1 Key modules
- `src/lib/types.ts` — shared types (`Track`, `CassetteStyle`, `Mixtape`, `CreateMixtapeInput`).
- `src/lib/spotify.ts` — token caching, `searchTracks`, `getPlaylistTracks` (paginated), `extractPlaylistId`, `mapSpotifyTrack`.
- `src/lib/store.ts` — `createMixtape`, `getMixtape`, `listMixtapes` (the only surface the rest of the app depends on; swappable for a real DB).
- `src/components/*` — UI (see feature specs below).

### 3.2 API surface
| Route | Method | Purpose |
|---|---|---|
| `/api/mixtapes` | POST | Create a mixtape; validates ≥1 song; returns `{ mixtape }`. |
| `/api/mixtapes/[id]` | GET | Fetch one mixtape (404 if missing). |
| `/api/spotify/search?q=` | GET | Proxy Spotify track search (keeps secret server-side). |
| `/api/spotify/playlist?url=` | GET | Resolve a playlist link → `{ name, tracks }`. |

### 3.3 Environment
- `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET` — server-side only, for search/playlist import.
- `NEXT_PUBLIC_BASE_URL` — base URL used for building shareable links (defaults to `http://localhost:3000`).

---

## 4. Data model

```ts
Track = {
  id: string;              // spotify track id, or `manual-<timestamp>` for manual entries
  title: string;
  artist: string;          // artists joined by ", "
  album?: string;
  albumArt?: string;       // 2nd (medium) image, falls back to first
  durationMs?: number;
  spotifyUrl?: string;
  previewUrl?: string | null; // 30s preview when available
  source: "spotify" | "manual";
}

CassetteStyle = {
  shellColor: string;   // hex
  labelColor: string;   // hex
  reelColor: string;    // hex
  labelText: string;    // printed on the cassette label (max 30 chars)
  font: "display" | "mono"; // handwritten vs typewriter
}

Mixtape = {
  id: string;           // nanoid(10)
  title: string;        // defaults to labelText, then "Untitled Mixtape"
  fromName: string;
  toName: string;
  note: string;         // max 800 chars; shown on the back of the cassette
  cassette: CassetteStyle;
  tracks: Track[];      // single tracklist (was sideA/sideB before v0.2.0)
  createdAt: string;    // ISO timestamp
}
```

---

## 5. Feature specs

### 5.1 Customize the cassette
**Where:** `CassetteEditor.tsx` (controls) + `Cassette.tsx` (live flip preview) on `/`.

The cassette is **single-sided with a flip**: the **front** is a clean cassette (SVG)
with the mixtape title on the label (echoing a real tape — label panel, tape window,
spinning reels, a "90 MIN" marking); the **back** shows the note (see §5.6).

Creators can adjust, with the preview re-rendering live:
- **Label text** — title printed on the cassette front (max 30 chars; defaults to "My Mixtape").
- **Shell color** — 7 presets + a native custom color picker.
- **Label color** — 5 presets (used on both the front label and the back note panel).
- **Reel color** — 5 presets.
- **Label font** — "Handwritten" (`display`/Caveat) or "Typewriter" (`mono`/Space Mono).
- **Flip** — a toggle (and clicking the cassette) rotates it in 3D to preview the note
  on the back; reels **spin** on the front of the editor preview (`spinning` prop).

**Defaults:** shell `#e8533f`, label/reel `#f4ecd8`, label "My Mixtape", font `display`.

### 5.2 Tracklist
- A **single tracklist** (`tracks`). Songs added via any of the three methods append to
  this one list; the running count is shown next to the "Songs" heading.
- Reorder (up/down) and remove per track. No A/B split — one continuous mixtape.

### 5.3 Adding songs (three ways)
**Where:** `TrackAdder.tsx` (tabbed: Search / Paste a playlist / Add manually).

1. **Search Spotify** — query → `/api/spotify/search` → results list (album art, title,
   artist). Tap a result to open a **preview player** before adding; "Add to this side"
   appends to the active side.
2. **Paste a playlist** — paste a public Spotify playlist URL / URI / bare ID
   (`extractPlaylistId`) → `/api/spotify/playlist` loads all tracks (paginated 100/page).
   Shows a pending list where individual tracks can be **removed before import**, a
   preview player, and "Add all N tracks" to bulk-append.
3. **Add manually** — title + artist (artist defaults to "Unknown artist"). Creates a
   `source: "manual"` track with id `manual-<timestamp>`, no album art/duration/preview.

### 5.4 Track preview player
**Where:** `TrackPreviewPlayer.tsx`. Two variants:
- `card` — album art, play/pause over art, progress bar, "30-second preview" label,
  optional "Add" button, and a "Spotify" link. If no `previewUrl` but the track is a
  real Spotify track, falls back to the **Spotify embed iframe**. Otherwise shows
  "No audio preview available."
- `inline` — a small play/pause button used inside the track list rows.
- Only one preview plays at a time (module-level `activeAudio` guard).

### 5.5 Track list management
**Where:** `TrackList.tsx` on `/`.
- Per-row: index, album art, title/artist (tap to open a preview above the list),
  inline play/pause, duration (on ≥sm screens), **move up / move down**, **remove**.
- Empty state prompts to search / paste / add manually.

### 5.6 Details & note
- **Details:** mixtape `title` (defaults to label text if blank), `From`, `To`.
- **Note:** free-text up to **800 chars** with a live counter; rendered on the **back of
  the cassette** (`font-display` on the label-colored panel, scrolls if long). Flip the
  cassette — via the toggle or by clicking it — to read it on both the builder preview
  and the share page.

### 5.7 Save
**Where:** `page.tsx` → `POST /api/mixtapes`.
- Save is **disabled until at least one song** exists (across both sides).
- Server re-validates ≥1 song, trims fields, applies title fallbacks, assigns id +
  `createdAt`, persists, and returns the mixtape. Client redirects to `/mixtape/[id]`.
- Errors surface inline (`saveError`).

### 5.8 Share view
**Where:** `MixtapeView.tsx` at `/mixtape/[id]` (server-fetched via `getMixtape`; 404 → `not-found.tsx`).
- Renders From/To line, the flippable cassette (non-spinning), a flip toggle (shown
  only when a note exists), the numbered tracklist with durations, and the creation date.
- **Flip** — the toggle or clicking the cassette rotates it to reveal the note on the back.
- **Copy share link** — copies `window.location.href` (2s "copied" confirmation).
- **Export as image** — `html-to-image` `toPng` of the card (`pixelRatio: 2`,
  bg `#12100e`), downloaded as `<title>-mixtape.png`. The export resets the cassette to
  its **front** first, so the PNG shows the title + tracklist (the note is read by flipping).

---

## 6. Non-functional notes & constraints

- **Persistence:** JSON file store works for `npm run start` on a normal server/VM but
  **not** on read-only/ephemeral filesystems (e.g. Vercel serverless). To deploy there,
  swap `src/lib/store.ts` for a hosted DB (Postgres/Supabase/Neon, Turso/SQLite) —
  keep the `createMixtape` / `getMixtape` / `listMixtapes` signatures.
- **Concurrency:** file store reads/writes the whole file with no locking; not safe for
  heavy concurrent writes.
- **Spotify limits:** search returns up to 10 results; playlist import is public
  playlists only; preview availability varies by track/market.
- **Privacy:** anyone with a link can view; ids are `nanoid(10)` (unguessable but not access-controlled).
- **Accessibility:** buttons carry `aria-label`s; audio elements are hidden with lint exceptions for captions.

---

## 7. Known limitations / gaps
- No edit or delete of a saved mixtape.
- No listing/discovery page (`listMixtapes` exists but is unused in the UI).
- Manual tracks have no art/duration/preview.
- No duplicate-track detection when adding.
- No drag-and-drop reordering (only up/down buttons).
- No track/time cap (real cassettes have a length limit).
- The PNG export shows the cassette **front** only; the note (on the back) isn't in the image.
- Long notes scroll within the cassette back rather than resizing to fit.
- No open-graph/social preview image for shared links.

---

## 8. Roadmap / candidate features
> Backlog for future iterations — not committed. Refine and pull into a spec section above when picked up.

- **Edit / delete** a saved mixtape (owner token or edit link).
- **Cassette length limit** with a running time gauge (e.g. 45/60/90-min tapes).
- **More customization:** shell textures/patterns, label templates, sticker/emoji, back-panel styling.
- **Drag-and-drop** reordering.
- **Open Graph image** for rich link previews (reuse the PNG export pipeline server-side).
- **Discovery / "recently made"** gallery (needs a privacy model first).
- **Apple Music / YouTube** track sources in addition to Spotify.
- **Full playback** via Spotify embed for the whole tracklist on the share page.
- **Themes / seasonal skins** for the cassette and card.

---

## 9. Changelog
> Add an entry per shipped change: date, what changed, and which spec sections were updated.

- **2026-07-19 (v0.2.0)** — Reworked the cassette from two sides (Side A / Side B) to a
  **single-sided cassette that flips**: the front shows the mixtape title, the back shows
  the note. Merged `sideA`/`sideB` into a single `tracks` list (store normalizes legacy
  records on read). Updated §1.1, §2.1–2.3, §4 (data model), §5.1 (customize), §5.2
  (now "Tracklist"), §5.6 (note on the back), §5.8 (flip + export resets to front), and
  §7–8. `Cassette.tsx` now renders a 3D flip (front SVG / back note); the builder and
  share view expose a flip toggle and click-to-flip.
- **2026-07-19** — Initial PRD authored from the v0.1.0 codebase. Documents cassette
  customization, three ways to add songs, track preview/management, notes, save, and
  the share view (link + PNG export).
