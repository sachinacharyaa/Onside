/**
 * ─── THE single source of truth for every threshold the agent uses ───
 *
 * Every number that influences a trading/settlement decision lives here,
 * nowhere else. This file is rendered verbatim in the frontend "Rules"
 * panel — the agent is auditable before it ever trades.
 *
 * Deltas and deviations are measured in implied-probability percentage
 * points for the HOME side: impliedProb = 100 / decimalOdds.
 */
export const rulesConfig = {
  ODDS_SWING: {
    /** Minimum implied-probability move (pts) to fire the rule. */
    minDeltaPts: 4,
    /** Max age (seconds of match time) of the previous tick to compare against. */
    windowSeconds: 900,
    /** confidence = min(100, |delta| * confidencePerPoint) */
    confidencePerPoint: 8,
  },
  SCORE_CHANGE: {
    /** Flat confidences per PRD. */
    goalConfidence: 90,
    redCardConfidence: 70,
    /** Yellow cards are noise — ignored below this floor. */
    yellowCardConfidence: 0,
  },
  TIME_DECAY_MISMATCH: {
    /**
     * Expected curve: while a team leads, its implied win probability should
     * drift linearly toward `terminalProb` as minutes remaining approach 0.
     * A divergence beyond `minDeviationPts` fires the rule.
     */
    terminalProb: 96,
    minDeviationPts: 8,
    /** confidence = min(100, deviation * confidencePerPoint) */
    confidencePerPoint: 10,
    fullTimeMinute: 90,
  },
  decision: {
    /** Signals at/above this confidence trigger an action (env-overridable). */
    settleThreshold: 80,
  },
} as const;

export type RulesConfig = typeof rulesConfig;
