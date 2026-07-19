# Mixtape — Product Requirements Document

> Living document. It describes what the Mixtape app **is today** (as built) and
> serves as the shared context for planning and shipping future changes. When you
> add or change a feature, update the relevant section and add an entry to the
> [Changelog](#changelog).

- **Status:** In active development (v0.3.0)
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
(Space Mono) fonts. The builder is a **mobile-first, single-column 4-step wizard**
(Design → Songs → Note → Recipient) to keep each screen light and low-friction.

### 1.3 Non-goals (current)
- No **app account** — you never sign up for Mixtape itself. (Playback is an *optional*
  Spotify connect: a listener may log in with their own Spotify **Premium** account to hear
  full tracks; it's not required to view or share.)
- No private/ownership model on mixtapes (anyone with the link can view).
- No **in-place editing** of a saved mixtape — "Remix" instead duplicates a tape into the
  wizard and saves a **new** mixtape; the original is immutable once created.
- Not built for high-scale multi-tenant use (single JSON file store).

---

## 2. Users & core flow

### 2.1 Personas
- **Creator** — makes a mixtape for a friend/partner. Primary user; the whole build
  experience is for them.
- **Recipient** — opens a shared link to view the mixtape, flip the cassette to read
  the note, preview tracks, and see the tracklist. Read-only.

### 2.2 Primary flow (creator) — 4-step wizard
Land on `/`, which renders a single-column wizard with a step-progress indicator and a
live cassette preview shown on **every** step. Back/Continue move between steps.
1. **Step 1 — Design:** "How should your cassette look?" — Mix's title (the cassette
   label), font, shell color, reel color. Preview shows the cassette front (reels spin).
2. **Step 2 — Songs:** "Curate the songs!" — add songs three ways, reorder/remove/preview.
3. **Step 3 — Note:** "Say what you wanna say here" — the note + Note's color (the label
   color). Preview auto-flips to the cassette back so you see the note as you type.
4. **Step 4 — Recipient:** "Who's this mixtape for?" — From / To. **Create mix** is
   disabled until ≥1 song (a hint links back to Step 2). Save → `/mixtape/[id]`.

The same wizard powers **Remix** at `/mixtape/[id]/remix` — it seeds every field from an
existing tape but **creates a new mixtape** on save (new id/link); the original is
untouched.

### 2.3 Recipient flow
1. Open `/mixtape/[id]`.
2. See a "for {to} — from {from}" line, the cassette front (title), and the tracklist.
   Flip the cassette to read the note on the back.
3. Playback via the **PREV / PLAY / NEXT** transport uses the **Spotify Web Playback SDK**:
   click **Connect Spotify** (one-time OAuth) and, if the account is **Premium**, the tape
   plays full tracks in-page — reels spin, the queue auto-advances, the current track
   highlights. Not connected or not Premium → a silent visual deck (Spotify no longer serves
   30s previews). See §5.8.
4. **Remix** (opens the wizard seeded from this tape to make your own new copy), **Share**
   (copies the link), or export the card as an image.

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
- `src/lib/spotify.ts` — Client-Credentials token caching, `searchTracks`, `getPlaylistTracks` (paginated), `extractPlaylistId`, `mapSpotifyTrack`.
- `src/lib/spotifyAuth.ts` — Authorization-Code helpers for user login (`buildAuthorizeUrl`,
  `exchangeCode`, `refreshAccessToken`, cookie-name + scope constants).
- `src/lib/useSpotifyPlayer.ts` — client hook wrapping the Spotify Web Playback SDK (loads
  the SDK, creates the player, exposes `play/toggle/next/prev/disconnect` + status).
- `src/lib/store.ts` — `createMixtape`, `getMixtape`, `listMixtapes` (the only surface the
  rest of the app depends on; swappable for a real DB).
- `src/components/MixtapeBuilder.tsx` — the 4-step wizard (used for create at `/` and for
  Remix at `/mixtape/[id]/remix`, which passes an optional `seed` mixtape but still
  creates a new one); `src/components/builder/*` — `StepProgress`, `ColorSwatches`. Other
  UI in `src/components/*` (see feature specs below).

### 3.2 API surface
| Route | Method | Purpose |
|---|---|---|
| `/api/mixtapes` | POST | Create a mixtape (also the target for a Remix save); validates ≥1 song; returns `{ mixtape }`. |
| `/api/mixtapes/[id]` | GET | Fetch one mixtape (404 if missing). |
| `/api/spotify/search?q=` | GET | Proxy Spotify track search (keeps secret server-side). |
| `/api/spotify/playlist?url=` | GET | Resolve a playlist link → `{ name, tracks }`. |
| `/api/spotify/auth/login` | GET | Start user OAuth (`?returnTo=`); 302 → Spotify authorize. |
| `/api/spotify/auth/callback` | GET | OAuth callback; sets httpOnly token cookies; 302 back to `returnTo`. |
| `/api/spotify/auth/token` | GET | Return a valid user access token for the SDK (refreshes; 401 if not connected). |
| `/api/spotify/auth/logout` | POST | Clear the Spotify token cookies. |

### 3.3 Environment
- `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET` — server-side only; used for search/playlist
  import (Client Credentials) **and** the user-login token exchange (Authorization Code).
- `NEXT_PUBLIC_BASE_URL` — base URL for shareable links **and** the OAuth redirect URI
  (`${base}/api/spotify/auth/callback`). For local dev use `http://127.0.0.1:3000` — Spotify
  rejects `http://localhost` as a redirect URI.
- **Spotify dashboard:** the redirect URI above must be registered under the app's
  Settings → Redirect URIs. Playback requires each listener to log in with a **Premium**
  account (`streaming user-read-email user-read-private` scopes are requested at login).

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
**Where:** `MixtapeBuilder.tsx` (wizard, splitting the controls across Steps 1 & 3) +
`builder/ColorSwatches.tsx` + `Cassette.tsx` (live flip preview).

The cassette is **single-sided with a flip**: the **front** is a clean cassette (SVG)
with the mixtape title on the label (echoing a real tape — label panel, tape window,
spinning reels, a "90 MIN" marking); the **back** shows the note (see §5.6).

Creators adjust the cassette across the wizard, with the preview re-rendering live:
- **Mix's title** (Step 1) — the label text printed on the cassette front (max 30 chars;
  defaults to "My Mixtape"). This doubles as the mixtape's title (see §5.6).
- **Font** (Step 1) — "Handwritten" (`display`/Caveat) or "Typewriter" (`mono`/Space Mono).
- **Shell color** (Step 1) — 7 presets + a native custom color picker.
- **Reel color** (Step 1) — 5 presets.
- **Note's color** (Step 3) — the `labelColor`: 5 presets used on both the front label and
  the back note panel.
- **Flip** — a "tap to flip & read the note" toggle (and clicking the cassette) rotates it
  in 3D; reels **spin** on the front. The preview auto-flips to the back on the Note step.

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

### 5.6 Recipient & note
- **Recipient (Step 4):** `From` and `To`. There is **no separate title field** — the
  mixtape `title` is the cassette label ("Mix's title", Step 1); the store still falls
  back title→labelText→"Untitled Mixtape".
- **Note (Step 3):** free-text up to **800 chars** with a live counter; rendered on the
  **back of the cassette** (`font-display` on the label-colored panel, scrolls if long).
  Flip the cassette — via the toggle or by clicking it — to read it on both the builder
  preview and the share page.

### 5.7 Save & remix
**Where:** `MixtapeBuilder.tsx` → `POST /api/mixtapes`. The wizard always **creates** a
mixtape; a **Remix** (reached at `/mixtape/[id]/remix`, server-fetched) just pre-seeds the
wizard fields from an existing tape via the `seed` prop, then saves a **new** mixtape.
- **Create mix** is **disabled until at least one song** exists.
- Server re-validates ≥1 song, trims fields, applies title fallbacks, assigns a fresh id +
  `createdAt`. Client redirects to `/mixtape/[id]`.
- Errors surface inline (`saveError`).

### 5.8 Share view
**Where:** `MixtapeView.tsx` at `/mixtape/[id]` (server-fetched via `getMixtape`; 404 → `not-found.tsx`).
- Renders a "for {to} — from {from}" line, the flippable cassette, a flip toggle (shown
  only when a note exists), a **PREV / PLAY / NEXT transport**, the numbered tracklist, and
  the creation date.
- **Transport (Spotify Web Playback SDK)** — PREV / PLAY / NEXT over the tracklist, backed by
  `useSpotifyPlayer.ts`. Because Spotify stopped serving 30s `preview_url`s, real audio needs
  a logged-in **Premium** user:
  - **Not connected:** the middle button becomes **Connect Spotify** (→ `/api/spotify/auth/login`).
    PREV/NEXT still move a local highlight; no audio, reels still.
  - **Connected + Premium:** PLAY starts the mixtape (`PUT /v1/me/player/play` with the full
    `spotify:track:…` URI list); PLAY/pause + PREV/NEXT drive the SDK; playback **auto-advances**;
    the cassette **reels spin** while playing; the current track highlights (synced from the
    SDK's `player_state_changed` by URI); a "Now n/total · Title — Artist" line shows position.
    A "Connected · Disconnect" toggle clears the session.
  - **Connected, not Premium:** shows "Spotify Premium is required to play"; deck stays silent.
  - **Manual tracks** (no Spotify id) are shown but marked "not on Spotify" and skipped in playback.
  - Only real Spotify tracks are playable; a mixtape with none shows "No Spotify tracks to play".
- **Remix** — navigates to `/mixtape/[id]/remix` (wizard seeded from this tape → new copy).
- **Share** — copies `window.location.href` (2s "copied" confirmation).
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
  playlists only. Spotify **no longer returns 30s `preview_url`s** for Client-Credentials
  apps, so in-page playback relies entirely on the Web Playback SDK (user login + Premium).
- **Playback auth:** user access/refresh tokens live in **httpOnly cookies**; the refresh
  token never reaches the browser (only short-lived access tokens, which the SDK needs). No
  ownership link between a Spotify login and a mixtape — connecting only enables playback.
  The redirect URI must be registered in the Spotify dashboard and must use `127.0.0.1`
  (not `localhost`) for local dev.
- **Privacy:** anyone with a link can view; ids are `nanoid(10)` (unguessable but not access-controlled).
- **Accessibility:** buttons carry `aria-label`s.

---

## 7. Known limitations / gaps
- **Playback needs Spotify Premium + login per listener** — free/not-logged-in recipients
  get a silent visual deck. Heavy for a "send a link" flow; the tradeoff of full-track audio.
- No **in-place edit** of a saved mixtape — Remix makes an independent copy, so fixing a
  typo means creating a new tape/link (the old one lingers).
- No **delete** of a saved mixtape.
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

- **In-place edit** (owner token or edit link) and **delete** of a saved mixtape.
- **Cassette length limit** with a running time gauge (e.g. 45/60/90-min tapes).
- **More customization:** shell textures/patterns, label templates, sticker/emoji, back-panel styling.
- **Drag-and-drop** reordering.
- **Open Graph image** for rich link previews (reuse the PNG export pipeline server-side).
- **Discovery / "recently made"** gallery (needs a privacy model first).
- **Apple Music / YouTube** track sources in addition to Spotify.
- **Playback without Premium** — e.g. Deezer 30s previews as a fallback audio source so
  non-Premium recipients hear *something*, or Apple Music previews.
- **Themes / seasonal skins** for the cassette and card.

---

## 9. Changelog
> Add an entry per shipped change: date, what changed, and which spec sections were updated.

- **2026-07-19 (v0.4.0)** — **Full-track playback on the share view via the Spotify Web
  Playback SDK.** Spotify stopped returning 30s `preview_url`s (confirmed: null for all
  search results), so the old preview/embed transport had no audio. Added the app's first
  user-auth — an Authorization-Code OAuth flow (`src/lib/spotifyAuth.ts` +
  `/api/spotify/auth/{login,callback,token,logout}`, tokens in httpOnly cookies) — and a
  `useSpotifyPlayer` hook that loads the Web Playback SDK and plays the mixtape's
  `spotify:track:…` URIs. `MixtapeView` now shows **Connect Spotify** when signed out and,
  once connected with **Premium**, drives full-track PLAY/PREV/NEXT (auto-advance, spinning
  reels, URI-synced highlight); not-connected/non-Premium keep a silent visual deck. Updated
  `.env.example` (redirect URI + `127.0.0.1` rule + Premium note) and PRD §1.3, §2.3, §3.1–3.3,
  §5.8, §6, §7–8. **Setup:** register `${NEXT_PUBLIC_BASE_URL}/api/spotify/auth/callback` in
  the Spotify dashboard; playback requires a Premium login.
- **2026-07-19 (v0.3.0)** — **Relayed out the builder as a mobile-first 4-step wizard**
  (Design → Songs → Note → Recipient) to cut cognitive load, with a step-progress
  indicator and a live cassette preview on every step. Consolidated the separate mixtape
  `title` into the cassette label ("Mix's title"); moved `labelColor` to Step 3 as "Note's
  color". Added **Remix**: a `/mixtape/[id]/remix` route that seeds the wizard from an
  existing tape (via `MixtapeBuilder`'s `seed` prop) but **creates a new mixtape** on save
  (no in-place editing — the original is immutable). **Redesigned the share view** with a
  "for {to} — from {from}" header, a PREV/PLAY/NEXT transport that plays 30s previews across
  the tracklist (auto-advance, skips preview-less tracks, current-track highlight), and
  Remix / Share / export-image actions. New components: `MixtapeBuilder`,
  `builder/StepProgress`, `builder/ColorSwatches`; removed `CassetteEditor`. Updated §1.2–1.3,
  §2.2–2.3, §3.1–3.2, §5.1, §5.6–5.8, §7–8.
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
