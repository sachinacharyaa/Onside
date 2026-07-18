import type { MatchEvent } from "@onside/ingestion";
import { rulesConfig } from "../rules.config.js";
import type { Signal } from "../types.js";
import { impliedProb, nextSignalId, round1 } from "../util.js";

export type TimeDecayState = {
  /** Set when a team takes the lead; cleared when scores level. */
  lead: { team: "home" | "away"; sinceMinute: number; probAtLead: number } | null;
};

export function createTimeDecayState(): TimeDecayState {
  return { lead: null };
}

/**
 * TIME_DECAY_MISMATCH — while a team leads, its implied win probability
 * should drift linearly from its value at the moment the lead was taken
 * toward `terminalProb` at full time. If the live market deviates from that
 * expected curve by >= `minDeviationPts`, the rule fires.
 * confidence = min(100, deviation * confidencePerPoint)
 */
export function evaluateTimeDecay(event: MatchEvent, state: TimeDecayState): Signal | null {
  const cfg = rulesConfig.TIME_DECAY_MISMATCH;

  // Track lead state on every event.
  if (event.scoreHome === event.scoreAway) {
    state.lead = null;
  } else {
    const team = event.scoreHome > event.scoreAway ? "home" : "away";
    if (!state.lead || state.lead.team !== team) {
      if (event.odds) {
        const leaderOdds = team === "home" ? event.odds.home : event.odds.away;
        state.lead = { team, sinceMinute: event.minute, probAtLead: impliedProb(leaderOdds) };
      } else {
        state.lead = null;
      }
      return null; // curve starts here; nothing to compare yet
    }
  }

  // Only compare on pure market updates while a lead is established.
  if (event.type !== "odds_tick" || !state.lead || !event.odds) return null;

  const { team, sinceMinute, probAtLead } = state.lead;
  const minutesTotal = Math.max(1, cfg.fullTimeMinute - sinceMinute);
  const progress = Math.min(1, (event.minute - sinceMinute) / minutesTotal);
  const expectedProb = probAtLead + (cfg.terminalProb - probAtLead) * progress;
  const actualProb = impliedProb(team === "home" ? event.odds.home : event.odds.away);
  const deviation = round1(Math.abs(expectedProb - actualProb));

  if (deviation < cfg.minDeviationPts) return null;

  const marketUnderpricesLeader = actualProb < expectedProb;
  return {
    id: nextSignalId("TIME_DECAY_MISMATCH", event.minute),
    triggeredBy: event,
    rule: "TIME_DECAY_MISMATCH",
    delta: deviation,
    confidence: Math.min(100, Math.round(deviation * cfg.confidencePerPoint)),
    // Market drifting away from the leader's expected curve → momentum is
    // against the leader; lean to the opposition. Otherwise hold.
    suggestedAction: marketUnderpricesLeader ? (team === "home" ? "OPEN_AWAY" : "OPEN_HOME") : "HOLD",
    detail: {
      expectedOdds: round1(100 / expectedProb),
      toOdds: team === "home" ? event.odds.home : event.odds.away,
    },
  };
}
