"use client";

import { useState } from "react";
import type { Track } from "@/lib/types";
import TrackPreviewPlayer from "@/components/TrackPreviewPlayer";

export default function TrackAdder({
  onAdd,
  onAddMany,
}: {
  onAdd: (track: Track) => void;
  onAddMany: (tracks: Track[]) => void;
}) {
  const [tab, setTab] = useState<"search" | "playlist" | "manual">("search");

  // Search tab state
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Track[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);

  // Playlist tab state
  const [playlistUrl, setPlaylistUrl] = useState("");
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [pendingPlaylist, setPendingPlaylist] = useState<{ name: string; tracks: Track[] } | null>(null);
  const [playlistPreview, setPlaylistPreview] = useState<Track | null>(null);

  // Manual tab state
  const [manualTitle, setManualTitle] = useState("");
  const [manualArtist, setManualArtist] = useState("");

  async function runSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    setSearchError(null);
    setSelectedTrack(null);
    try {
      const res = await fetch(`/api/spotify/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Search failed");
      setResults(data.tracks);
    } catch (err: any) {
      setSearchError(err.message);
    } finally {
      setSearching(false);
    }
  }

  async function runImport(e: React.FormEvent) {
    e.preventDefault();
    if (!playlistUrl.trim()) return;
    setImporting(true);
    setImportError(null);
    setPendingPlaylist(null);
    setPlaylistPreview(null);
    try {
      const res = await fetch(`/api/spotify/playlist?url=${encodeURIComponent(playlistUrl)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Import failed");
      setPendingPlaylist({ name: data.name, tracks: data.tracks });
      setPlaylistPreview(data.tracks[0] ?? null);
      setPlaylistUrl("");
    } catch (err: any) {
      setImportError(err.message);
    } finally {
      setImporting(false);
    }
  }

  function addManual(e: React.FormEvent) {
    e.preventDefault();
    if (!manualTitle.trim()) return;
    onAdd({
      id: `manual-${Date.now()}`,
      title: manualTitle.trim(),
      artist: manualArtist.trim() || "Unknown artist",
      source: "manual",
    });
    setManualTitle("");
    setManualArtist("");
  }

  function selectSearchTrack(track: Track) {
    setSelectedTrack(track);
  }

  function addSelectedTrack() {
    if (!selectedTrack) return;
    onAdd(selectedTrack);
    setSelectedTrack(null);
  }

  function confirmPlaylistImport() {
    if (!pendingPlaylist) return;
    onAddMany(pendingPlaylist.tracks);
    setPendingPlaylist(null);
    setPlaylistPreview(null);
  }

  function removeFromPending(index: number) {
    if (!pendingPlaylist) return;
    const tracks = pendingPlaylist.tracks.filter((_, i) => i !== index);
    if (tracks.length === 0) {
      setPendingPlaylist(null);
      setPlaylistPreview(null);
      return;
    }
    setPendingPlaylist({ ...pendingPlaylist, tracks });
    if (playlistPreview && !tracks.find((t) => t.id === playlistPreview.id)) {
      setPlaylistPreview(tracks[0]);
    }
  }

  return (
    <div className="rounded-lg border border-cream/15 bg-black/20">
      <div className="flex border-b border-cream/15 text-sm">
        {[
          ["search", "Search Spotify"],
          ["playlist", "Paste a playlist"],
          ["manual", "Add manually"],
        ].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key as typeof tab)}
            className={`flex-1 px-3 py-2.5 transition ${
              tab === key ? "bg-cream/10 text-cream" : "text-cream/50 hover:text-cream/80"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="p-4">
        {tab === "search" && (
          <div className="space-y-4">
            <form onSubmit={runSearch} className="flex gap-2">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Song title or artist..."
                className="flex-1 rounded-md bg-black/30 border border-cream/15 px-3 py-2 text-sm placeholder:text-cream/30 focus:outline-none focus:border-cream/40"
              />
              <button
                type="submit"
                disabled={searching}
                className="px-4 py-2 rounded-md bg-cream text-ink text-sm font-semibold hover:bg-cream/90 disabled:opacity-50"
              >
                {searching ? "Searching…" : "Search"}
              </button>
            </form>
            {searchError && <p className="text-sm text-red-400">{searchError}</p>}

            {selectedTrack && (
              <TrackPreviewPlayer
                track={selectedTrack}
                autoPlay
                onAdd={addSelectedTrack}
                addLabel="Add to mixtape"
              />
            )}

            {results.length > 0 && (
              <div>
                <p className="text-xs text-cream/40 mb-2 uppercase tracking-wide">
                  Tap a song to preview before adding
                </p>
                <ul className="space-y-1 max-h-64 overflow-y-auto">
                  {results.map((t) => {
                    const isSelected = selectedTrack?.id === t.id;
                    return (
                      <li key={t.id}>
                        <button
                          type="button"
                          onClick={() => selectSearchTrack(t)}
                          className={`w-full flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left transition ${
                            isSelected ? "bg-cream/15 ring-1 ring-cream/30" : "hover:bg-cream/5"
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            {t.albumArt && (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={t.albumArt}
                                alt=""
                                className="w-9 h-9 rounded object-cover flex-shrink-0"
                              />
                            )}
                            <div className="min-w-0">
                              <p className="text-sm truncate">{t.title}</p>
                              <p className="text-xs text-cream/50 truncate">{t.artist}</p>
                            </div>
                          </div>
                          <span className="text-xs text-cream/40 flex-shrink-0">
                            {isSelected ? "▶ Previewing" : "Preview"}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>
        )}

        {tab === "playlist" && (
          <div className="space-y-4">
            {!pendingPlaylist ? (
              <>
                <form onSubmit={runImport} className="flex gap-2">
                  <input
                    value={playlistUrl}
                    onChange={(e) => setPlaylistUrl(e.target.value)}
                    placeholder="Paste Spotify playlist link..."
                    className="flex-1 rounded-md bg-black/30 border border-cream/15 px-3 py-2 text-sm placeholder:text-cream/30 focus:outline-none focus:border-cream/40"
                  />
                  <button
                    type="submit"
                    disabled={importing}
                    className="px-4 py-2 rounded-md bg-cream text-ink text-sm font-semibold hover:bg-cream/90 disabled:opacity-50"
                  >
                    {importing ? "Loading…" : "Load playlist"}
                  </button>
                </form>
                <p className="text-xs text-cream/40">
                  Works with public Spotify playlists. You can preview tracks before adding them.
                </p>
                {importError && <p className="text-sm text-red-400">{importError}</p>}
              </>
            ) : (
              <>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold truncate">{pendingPlaylist.name}</p>
                  <button
                    type="button"
                    onClick={() => {
                      setPendingPlaylist(null);
                      setPlaylistPreview(null);
                    }}
                    className="text-xs text-cream/50 hover:text-cream"
                  >
                    Cancel
                  </button>
                </div>

                {playlistPreview && (
                  <TrackPreviewPlayer
                    key={playlistPreview.id}
                    track={playlistPreview}
                    autoPlay
                    addLabel={`Add all ${pendingPlaylist.tracks.length} tracks`}
                    onAdd={confirmPlaylistImport}
                  />
                )}

                <div>
                  <p className="text-xs text-cream/40 mb-2 uppercase tracking-wide">
                    {pendingPlaylist.tracks.length} tracks — tap to preview
                  </p>
                  <ul className="space-y-1 max-h-48 overflow-y-auto">
                    {pendingPlaylist.tracks.map((t, i) => {
                      const isSelected = playlistPreview?.id === t.id;
                      return (
                        <li key={`${t.id}-${i}`}>
                          <div
                            className={`flex items-center gap-2 rounded-md px-2 py-1.5 transition ${
                              isSelected ? "bg-cream/15 ring-1 ring-cream/30" : "hover:bg-cream/5"
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => setPlaylistPreview(t)}
                              className="flex items-center gap-2 min-w-0 flex-1 text-left"
                            >
                              {t.albumArt && (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={t.albumArt}
                                  alt=""
                                  className="w-8 h-8 rounded object-cover flex-shrink-0"
                                />
                              )}
                              <div className="min-w-0">
                                <p className="text-sm truncate">{t.title}</p>
                                <p className="text-xs text-cream/50 truncate">{t.artist}</p>
                              </div>
                            </button>
                            <button
                              type="button"
                              onClick={() => removeFromPending(i)}
                              className="w-6 h-6 rounded hover:bg-red-500/20 text-xs text-red-400 flex-shrink-0"
                              aria-label="Remove from import"
                            >
                              ✕
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </>
            )}
          </div>
        )}

        {tab === "manual" && (
          <form onSubmit={addManual} className="space-y-2">
            <input
              value={manualTitle}
              onChange={(e) => setManualTitle(e.target.value)}
              placeholder="Song title"
              className="w-full rounded-md bg-black/30 border border-cream/15 px-3 py-2 text-sm placeholder:text-cream/30 focus:outline-none focus:border-cream/40"
            />
            <input
              value={manualArtist}
              onChange={(e) => setManualArtist(e.target.value)}
              placeholder="Artist"
              className="w-full rounded-md bg-black/30 border border-cream/15 px-3 py-2 text-sm placeholder:text-cream/30 focus:outline-none focus:border-cream/40"
            />
            <button
              type="submit"
              className="px-4 py-2 rounded-md bg-cream text-ink text-sm font-semibold hover:bg-cream/90"
            >
              Add song
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
