import type { MatchEvent } from "@onside/ingestion";
import { createOddsSwingState, evaluateOddsSwing, type OddsSwingState } from "./rules/oddsSwing.js";
import { evaluateScoreChange } from "./rules/scoreChange.js";
import { createTimeDecayState, evaluateTimeDecay, type TimeDecayState } from "./rules/timeDecay.js";
import type { Signal } from "./types.js";

export { rulesConfig, type RulesConfig } from "./rules.config.js";
export type { Signal, RuleName, SuggestedAction } from "./types.js";

export type SignalEngine = {
  /** Runs every rule against the event. Multiple signals can fire per event. */
  evaluate(event: MatchEvent): Signal[];
};

/**
 * Deterministic rules engine — no ML, no LLM, no randomness.
 * Every signal traces to a named rule and an explicit formula in rules.config.ts.
 */
export function createSignalEngine(): SignalEngine {
  const oddsSwingState: OddsSwingState = createOddsSwingState();
  const timeDecayState: TimeDecayState = createTimeDecayState();

  return {
    evaluate(event: MatchEvent): Signal[] {
      const signals: Signal[] = [];

      const scoreChange = evaluateScoreChange(event);
      if (scoreChange) signals.push(scoreChange);

      const oddsSwing = evaluateOddsSwing(event, oddsSwingState);
      if (oddsSwing) signals.push(oddsSwing);

      const timeDecay = evaluateTimeDecay(event, timeDecayState);
      if (timeDecay) signals.push(timeDecay);

      return signals;
    },
  };
}
