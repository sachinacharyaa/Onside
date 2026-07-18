import type { MatchEvent } from "@onside/ingestion";
import { rulesConfig } from "../rules.config.js";
import type { Signal } from "../types.js";
import { impliedProb, nextSignalId, round1 } from "../util.js";

export type OddsSwingState = {
  lastOdds: { home: number; away: number } | null;
  lastMinute: number;
};

export function createOddsSwingState(): OddsSwingState {
  return { lastOdds: null, lastMinute: 0 };
}

/**
 * ODDS_SWING — fires when home implied probability moves by at least
 * `minDeltaPts` between consecutive odds updates inside the window.
 * confidence = min(100, |delta| * confidencePerPoint)
 */
export function evaluateOddsSwing(event: MatchEvent, state: OddsSwingState): Signal | null {
  if (!event.odds) return null;
  const cfg = rulesConfig.ODDS_SWING;

  const prev = state.lastOdds;
  const prevMinute = state.lastMinute;
  state.lastOdds = { home: event.odds.home, away: event.odds.away };
  state.lastMinute = event.minute;

  if (!prev) return null;
  if ((event.minute - prevMinute) * 60 > cfg.windowSeconds) return null;

  const delta = round1(impliedProb(event.odds.home) - impliedProb(prev.home));
  if (Math.abs(delta) < cfg.minDeltaPts) return null;

  const confidence = Math.min(100, Math.round(Math.abs(delta) * cfg.confidencePerPoint));
  return {
    id: nextSignalId("ODDS_SWING", event.minute),
    triggeredBy: event,
    rule: "ODDS_SWING",
    delta,
    confidence,
    suggestedAction: delta > 0 ? "OPEN_HOME" : "OPEN_AWAY",
    detail: { fromOdds: prev.home, toOdds: event.odds.home },
  };
}
