export type MatchEvent = {
  matchId: string;
  minute: number;
  type: "goal" | "card" | "substitution" | "odds_tick" | "kickoff" | "fulltime";
  team?: "home" | "away";
  /** Card colour, only present for `card` events. */
  card?: "yellow" | "red";
  /** Player involved, when known (goals, cards, subs). */
  player?: string;
  odds?: { home: number; draw?: number; away: number };
  scoreHome: number;
  scoreAway: number;
  timestamp: string; // ISO
  /** TxLINE Seq when present — used for settlement Merkle validation. */
  seq?: number;
};

export type MatchMeta = {
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  competition: string;
  /** TxLINE fixture id when this replay was recorded from historical/live. */
  fixtureId?: number;
  /** Seq of the game_finalised scores record (preferred for validateStat). */
  finalSeq?: number;
  /** Kickoff epoch ms (from TxLINE StartTime). */
  kickoffMs?: number;
  /** Final score string e.g. "4-6". */
  finalScore?: string;
};

/**
 * Unified event source. `replay-client` and `txline-client` both implement
 * this so live vs. replay is a config flip, never a code change downstream.
 */
export interface MatchEventSource {
  readonly meta: MatchMeta;
  start(): void;
  stop(): void;
  on(event: "event", listener: (e: MatchEvent) => void): this;
  on(event: "end", listener: () => void): this;
  on(event: "error", listener: (err: Error) => void): this;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  off(event: string, listener: (...args: any[]) => void): this;
}
