import type { MatchEvent } from "@onside/ingestion";

export type RuleName = "ODDS_SWING" | "SCORE_CHANGE" | "TIME_DECAY_MISMATCH";

export type SuggestedAction =
  | "OPEN_HOME"
  | "OPEN_AWAY"
  | "HOLD"
  | "SETTLE_HOME"
  | "SETTLE_AWAY"
  | "SETTLE_DRAW";

export type Signal = {
  id: string;
  triggeredBy: MatchEvent;
  rule: RuleName;
  /** e.g. odds movement in implied-probability percentage points */
  delta?: number;
  /** 0-100, computed deterministically from the rule's formula */
  confidence: number;
  suggestedAction: SuggestedAction;
  /** Human-oriented detail used by narration templates (from/to odds etc.) */
  detail?: {
    fromOdds?: number;
    toOdds?: number;
    expectedOdds?: number;
  };
};
