import type { ReplayFile } from "./replay-client.js";
import type { MatchMeta } from "./types.js";
import fraEng3rd from "../replay-data/txline-18257865.json";
import engArgSf from "../replay-data/txline-18241006.json";
import fraEspSf from "../replay-data/txline-18237038.json";

export type ReplayEntry = {
  /** Stable id used in the UI and the ?match= query param. */
  id: string;
  file: string;
  replay: ReplayFile;
};

/**
 * Real TxLINE-recorded finished fixtures for the demo UI, most recent first.
 * Static JSON imports are inlined by the Vercel stream esbuild bundle.
 */
export const replayRegistry: ReplayEntry[] = [
  {
    id: "txline-18257865",
    file: "txline-18257865.json",
    replay: fraEng3rd as unknown as ReplayFile,
  },
  {
    id: "txline-18241006",
    file: "txline-18241006.json",
    replay: engArgSf as unknown as ReplayFile,
  },
  {
    id: "txline-18237038",
    file: "txline-18237038.json",
    replay: fraEspSf as unknown as ReplayFile,
  },
];

export function listReplays(): { id: string; meta: MatchMeta }[] {
  return replayRegistry.map((entry) => ({ id: entry.id, meta: entry.replay.meta }));
}

export function getReplayById(id: string): ReplayEntry | undefined {
  return replayRegistry.find((entry) => entry.id === id);
}
