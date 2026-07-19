import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { ReplayFile } from "./replay-client.js";
import type { MatchMeta } from "./types.js";

export type ReplayEntry = {
  /** Stable id used in the UI and the ?match= query param. */
  id: string;
  file: string;
  replay: ReplayFile;
};

const require = createRequire(import.meta.url);
const dataDir = join(dirname(fileURLToPath(import.meta.url)), "../replay-data");

function loadReplayJson(file: string): ReplayFile {
  return require(join(dataDir, file)) as ReplayFile;
}

/**
 * Real TxLINE-recorded finished fixtures for the demo UI, most recent first.
 * Loaded via createRequire so Vercel Node does not need `with { type: "json" }`.
 */
export const replayRegistry: ReplayEntry[] = [
  {
    id: "txline-18257865",
    file: "txline-18257865.json",
    replay: loadReplayJson("txline-18257865.json"),
  },
  {
    id: "txline-18241006",
    file: "txline-18241006.json",
    replay: loadReplayJson("txline-18241006.json"),
  },
  {
    id: "txline-18237038",
    file: "txline-18237038.json",
    replay: loadReplayJson("txline-18237038.json"),
  },
];

export function listReplays(): { id: string; meta: MatchMeta }[] {
  return replayRegistry.map((entry) => ({ id: entry.id, meta: entry.replay.meta }));
}

export function getReplayById(id: string): ReplayEntry | undefined {
  return replayRegistry.find((entry) => entry.id === id);
}
