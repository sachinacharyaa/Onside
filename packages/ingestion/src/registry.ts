import type { ReplayFile } from "./replay-client.js";
import type { MatchMeta } from "./types.js";
import sampleMatch from "../replay-data/sample-match.json";
import espArg from "../replay-data/esp-arg.json";
import fraEng from "../replay-data/fra-eng.json";

export type ReplayEntry = {
  /** Stable id used in the UI and the ?match= query param. */
  id: string;
  file: string;
  replay: ReplayFile;
};

/**
 * Statically-bundled replay matches available to the demo UI's match
 * selector. Recorded TxLINE matches (REPLAY_FILE env) load dynamically
 * and are not listed here.
 */
export const replayRegistry: ReplayEntry[] = [
  { id: "bra-fra", file: "sample-match.json", replay: sampleMatch as unknown as ReplayFile },
  { id: "esp-arg", file: "esp-arg.json", replay: espArg as unknown as ReplayFile },
  { id: "fra-eng", file: "fra-eng.json", replay: fraEng as unknown as ReplayFile },
];

export function listReplays(): { id: string; meta: MatchMeta }[] {
  return replayRegistry.map((entry) => ({ id: entry.id, meta: entry.replay.meta }));
}

export function getReplayById(id: string): ReplayEntry | undefined {
  return replayRegistry.find((entry) => entry.id === id);
}
