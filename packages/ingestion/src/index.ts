import { createRequire } from "node:module";
import { ReplayClient, type ReplayFile } from "./replay-client.js";
import { TxlineClient } from "./txline-client.js";
import type { MatchEventSource } from "./types.js";

export type { MatchEvent, MatchEventSource, MatchMeta } from "./types.js";
export { ReplayClient, type ReplayFile, type ReplayClientOptions } from "./replay-client.js";
export { TxlineClient, type TxlineClientOptions } from "./txline-client.js";
export { TxlineNormalizer } from "./txline-normalize.js";

const require = createRequire(import.meta.url);

export function loadSampleMatch(): ReplayFile {
  return require("../replay-data/sample-match.json") as ReplayFile;
}

/** Loads a replay file from replay-data/ by name (e.g. "txline-123.json"). */
export function loadReplayFile(name?: string): ReplayFile {
  if (!name) return loadSampleMatch();
  return require(`../replay-data/${name}`) as ReplayFile;
}

export type SourceConfig = {
  useReplayMode: boolean;
  replayIntervalMs: number;
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
  });
}
