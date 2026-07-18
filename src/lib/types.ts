export type Track = {
  id: string; // spotify track id, or a local id for manually-entered tracks
  title: string;
  artist: string;
  album?: string;
  albumArt?: string;
  durationMs?: number;
  spotifyUrl?: string;
  previewUrl?: string | null;
  source: "spotify" | "manual";
};

export type CassetteStyle = {
  shellColor: string; // hex
  labelColor: string; // hex
  reelColor: string;
  labelText: string; // title printed on the cassette label
  font: "display" | "mono";
};

export type Mixtape = {
  id: string;
  title: string;
  fromName: string;
  toName: string;
  note: string;
  cassette: CassetteStyle;
  sideA: Track[];
  sideB: Track[];
  createdAt: string;
};

export type CreateMixtapeInput = Omit<Mixtape, "id" | "createdAt">;
