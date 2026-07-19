import type { ReplayFile } from "./replay-client.js";
import type { MatchMeta } from "./types.js";
import sampleMatch from "../replay-data/sample-match.json";
import handBuiltBraFra from "../replay-data/sample-match.hand-built.json";
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
 * selector. Primary entry is the recorded TxLINE historical fixture
 * (sample-match.json). Hand-built timelines remain as secondary options.
 */
export const replayRegistry: ReplayEntry[] = [
  {
    id: "fra-eng-3rd",
    file: "sample-match.json",
    replay: sampleMatch as unknown as ReplayFile,
  },
  {
    id: "bra-fra",
    file: "sample-match.hand-built.json",
    replay: handBuiltBraFra as unknown as ReplayFile,
  },
  { id: "esp-arg", file: "esp-arg.json", replay: espArg as unknown as ReplayFile },
  { id: "fra-eng", file: "fra-eng.json", replay: fraEng as unknown as ReplayFile },
];

export function listReplays(): { id: string; meta: MatchMeta }[] {
  return replayRegistry.map((entry) => ({ id: entry.id, meta: entry.replay.meta }));
}

export function getReplayById(id: string): ReplayEntry | undefined {
  return replayRegistry.find((entry) => entry.id === id);
}
