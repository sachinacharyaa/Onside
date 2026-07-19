import { replayRegistry } from "./registry.js";
import { ReplayClient, type ReplayFile } from "./replay-client.js";
import { TxlineClient } from "./txline-client.js";
import type { MatchEventSource } from "./types.js";

export type { MatchEvent, MatchEventSource, MatchMeta } from "./types.js";
export { ReplayClient, type ReplayFile, type ReplayClientOptions } from "./replay-client.js";
export { TxlineClient, type TxlineClientOptions } from "./txline-client.js";
export { TxlineNormalizer } from "./txline-normalize.js";
export { replayRegistry, listReplays, getReplayById, type ReplayEntry } from "./registry.js";

export function loadSampleMatch(): ReplayFile {
  return replayRegistry[0].replay;
}

/**
 * Loads a replay by registry file name or dynamically from replay-data/
 * (e.g. a recorded "txline-123.json").
 */
export function loadReplayFile(name?: string): ReplayFile {
  if (!name) return loadSampleMatch();
  const registered = replayRegistry.find((entry) => entry.file === name);
  if (registered) return registered.replay;
  // Dynamic disk load for locally recorded files (not used in the Vercel bundle).
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createRequire } = require("node:module") as typeof import("node:module");
    const req = createRequire(__filename);
    return req(`../replay-data/${name}`) as ReplayFile;
  } catch {
    throw new Error(`Replay file not in registry and not on disk: ${name}`);
  }
}

export type SourceConfig = {
  useReplayMode: boolean;
  replayIntervalMs: number;
  /**
   * Compress real event timestamps by this factor (e.g. 60 → ~2 min demo).
   * When unset / 0, ReplayClient uses fixed `replayIntervalMs` gaps.
   */
  replaySpeed?: number;
  /** Replay file name inside packages/ingestion/replay-data (default sample-match.json). */
  replayFile?: string;
  txlineApiUrl?: string;
  txlineApiToken?: string;
  txlineFixtureId?: number;
};

/**
 * Factory: returns the configured MatchEventSource. Downstream code never
 * knows (or cares) whether it's live or replay.
 */
export function createMatchEventSource(config: SourceConfig): MatchEventSource {
  if (
    !config.useReplayMode &&
    config.txlineApiUrl &&
    config.txlineApiToken &&
    config.txlineFixtureId
  ) {
    return new TxlineClient({
      apiUrl: config.txlineApiUrl,
      apiToken: config.txlineApiToken,
      fixtureId: config.txlineFixtureId,
    });
  }
  return new ReplayClient(loadReplayFile(config.replayFile), {
    intervalMs: config.replayIntervalMs,
    speed: config.replaySpeed,
  });
}
