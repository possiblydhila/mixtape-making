import { NextRequest, NextResponse } from "next/server";
import { extractPlaylistId, getPlaylistTracks } from "@/lib/spotify";

export async function GET(req: NextRequest) {
  const input = req.nextUrl.searchParams.get("url") ?? "";
  const playlistId = extractPlaylistId(input);

  if (!playlistId) {
    return NextResponse.json(
      { error: "Couldn't find a playlist ID in that link. Paste a full Spotify playlist URL." },
      { status: 400 }
    );
  }

  try {
    const { name, tracks } = await getPlaylistTracks(playlistId);
    return NextResponse.json({ name, tracks });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
