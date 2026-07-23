import type { MatchEvent } from "@onside/ingestion";
import type { Signal } from "../types.js";
import { nextSignalId } from "../util.js";

/**
 * Soft observations when no trading rule fires — keeps Decision Log in
 * lockstep with Market Pulse without triggering actions.
 */
export function observeEvent(event: MatchEvent): Signal | null {
  if (event.type === "odds_tick" && event.odds) {
    return {
      id: nextSignalId("ODDS_SWING", event.minute),
      triggeredBy: event,
      rule: "ODDS_SWING",
      confidence: 0,
      suggestedAction: "HOLD",
      detail: {
        fromOdds: event.odds.home,
        toOdds: event.odds.away,
        drawOdds: event.odds.draw,
      },
    };
  }

  if (event.type === "card" && event.card === "yellow") {
    return {
      id: nextSignalId("SCORE_CHANGE", event.minute),
      triggeredBy: event,
      rule: "SCORE_CHANGE",
      confidence: 0,
      suggestedAction: "HOLD",
    };
  }

  if (event.type === "substitution") {
    return {
      id: nextSignalId("SCORE_CHANGE", event.minute),
      triggeredBy: event,
      rule: "SCORE_CHANGE",
      confidence: 0,
      suggestedAction: "HOLD",
    };
  }

  return null;
}
