import fs from "fs";
import path from "path";
import { nanoid } from "nanoid";
import type { CreateMixtapeInput, Mixtape } from "./types";

// Simple file-based JSON store. Good enough for a personal / small-scale
// mixtape app without needing to stand up a real database.
// Swap this module out for a real DB (Postgres, SQLite, etc.) if you need
// concurrent multi-user scale.

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "mixtapes.json");

function ensureStore(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ mixtapes: [] }, null, 2));
  }
}

// Older records stored songs as `sideA` / `sideB`. The app now uses a single
// `tracks` list, so fold any legacy sides into `tracks` when reading.
function normalize(raw: any): Mixtape {
  if (Array.isArray(raw?.tracks)) return raw as Mixtape;
  const { sideA, sideB, ...rest } = raw ?? {};
  return { ...rest, tracks: [...(sideA ?? []), ...(sideB ?? [])] } as Mixtape;
}

function readAll(): Mixtape[] {
  ensureStore();
  const raw = fs.readFileSync(DATA_FILE, "utf-8");
  try {
    return (JSON.parse(raw).mixtapes as any[]).map(normalize);
  } catch {
    return [];
  }
}

function writeAll(mixtapes: Mixtape[]): void {
  ensureStore();
  fs.writeFileSync(DATA_FILE, JSON.stringify({ mixtapes }, null, 2));
}

export function createMixtape(input: CreateMixtapeInput): Mixtape {
  const mixtape: Mixtape = {
    ...input,
    id: nanoid(10),
    createdAt: new Date().toISOString(),
  };
  const all = readAll();
  all.unshift(mixtape);
  writeAll(all);
  return mixtape;
}

export function getMixtape(id: string): Mixtape | undefined {
  return readAll().find((m) => m.id === id);
}

export function listMixtapes(): Mixtape[] {
  return readAll();
}
