import type { MatchEvent } from "@onside/ingestion";
import { rulesConfig } from "../rules.config.js";
import type { Signal, SuggestedAction } from "../types.js";
import { nextSignalId } from "../util.js";

/**
 * SCORE_CHANGE — fires on goals (flat 90), red cards (flat 70) and
 * full-time (100, converts the final score into a settle action).
 */
export function evaluateScoreChange(event: MatchEvent): Signal | null {
  const cfg = rulesConfig.SCORE_CHANGE;

  if (event.type === "kickoff") {
    return {
      id: nextSignalId("SCORE_CHANGE", event.minute),
      triggeredBy: event,
      rule: "SCORE_CHANGE",
      confidence: 0,
      suggestedAction: "HOLD",
      detail: { fromOdds: event.odds?.home },
    };
  }

  if (event.type === "fulltime") {
    const action: SuggestedAction =
      event.scoreHome > event.scoreAway
        ? "SETTLE_HOME"
        : event.scoreAway > event.scoreHome
          ? "SETTLE_AWAY"
          : "SETTLE_DRAW";
    return {
      id: nextSignalId("SCORE_CHANGE", event.minute),
      triggeredBy: event,
      rule: "SCORE_CHANGE",
      confidence: 100,
      suggestedAction: action,
    };
  }

  if (event.type === "goal") {
    return {
      id: nextSignalId("SCORE_CHANGE", event.minute),
      triggeredBy: event,
      rule: "SCORE_CHANGE",
      confidence: cfg.goalConfidence,
      suggestedAction: event.team === "home" ? "OPEN_HOME" : "OPEN_AWAY",
    };
  }

  if (event.type === "card" && event.card === "red") {
    return {
      id: nextSignalId("SCORE_CHANGE", event.minute),
      triggeredBy: event,
      rule: "SCORE_CHANGE",
      confidence: cfg.redCardConfidence,
      // A red card weakens the carded team — lean to the opposition.
      suggestedAction: event.team === "home" ? "OPEN_AWAY" : "OPEN_HOME",
    };
  }

  return null;
}
