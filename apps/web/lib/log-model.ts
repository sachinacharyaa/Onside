import type { NarrationLine } from "@onside/narration-engine";
import type { DecisionAction } from "./stream-types";

/**
 * Color in the decision log always follows TEAM, never action state:
 * home = turf, away = whistle, neutral (time-decay, match-wide) = ink.
 * Execution state is shown only through the stamp chip / dimming.
 */
export type TeamSide = "home" | "away" | "neutral";

export function sideOfLine(line: NarrationLine): TeamSide {
  const event = line.signal.triggeredBy;
  if (event.team) return event.team;
  // Odds swings carry a directional lean toward one side's market.
  if (line.signal.rule === "ODDS_SWING") {
    if (line.signal.suggestedAction === "OPEN_HOME") return "home";
    if (line.signal.suggestedAction === "OPEN_AWAY") return "away";
  }
  // Time-decay mismatches and match-wide events (full-time, settlement)
  // are the official's own observations — neutral ink.
  return "neutral";
}

export function isExecuted(action: DecisionAction | undefined): boolean {
  return action === "opened" || action === "settling";
}

/** Short human label for what the agent actually did. */
export function executedLabel(line: NarrationLine): string {
  const action = line.signal.suggestedAction;
  switch (action) {
    case "OPEN_HOME":
      return "Opened home";
    case "OPEN_AWAY":
      return "Opened away";
    case "SETTLE_HOME":
    case "SETTLE_AWAY":
    case "SETTLE_DRAW":
      return "Settling";
    default:
      return "Held";
  }
}
