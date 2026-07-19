"use client";

import { rulesConfig } from "@onside/signal-engine";

/**
 * The written rulebook — the exact thresholds the agent runs on, read
 * live from rules.config.ts. The ONLY place monospace is used: these
 * values are literally code.
 */
export function Rulebook({ settleThreshold }: { settleThreshold: number }) {
  const rules = [
    {
      name: "Odds swing",
      trigger: `Fires when implied probability moves ${rulesConfig.ODDS_SWING.minDeltaPts}+ points between updates.`,
      formula: `min(100, |Δ| × ${rulesConfig.ODDS_SWING.confidencePerPoint})`,
    },
    {
      name: "Score change",
      trigger: "Fires on goals, red cards, and the final whistle.",
      formula: `goal ${rulesConfig.SCORE_CHANGE.goalConfidence} · red card ${rulesConfig.SCORE_CHANGE.redCardConfidence} · full-time 100`,
    },
    {
      name: "Decay mismatch",
      trigger: `Fires when the leader's price drifts ${rulesConfig.TIME_DECAY_MISMATCH.minDeviationPts}+ points off the expected curve.`,
      formula: `min(100, dev × ${rulesConfig.TIME_DECAY_MISMATCH.confidencePerPoint})`,
    },
  ];

  return (
    <section
      aria-label="The rulebook"
      className="rounded-md border border-hairline bg-chalk-2/50 p-4 sm:p-5"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-lg font-semibold uppercase tracking-wide">
          The rulebook
        </h2>
        <p className="font-display text-[13px] font-semibold uppercase tracking-wider text-turf">
          Acts only above {settleThreshold}% confidence
        </p>
      </div>
      <p className="mt-1 text-sm text-linesman">
        Every threshold the agent uses, read live from{" "}
        <code className="font-mono text-[13px] text-ink">rules.config.ts</code>. Nothing else
        decides.
      </p>

      <ul className="mt-4 space-y-4">
        {rules.map((rule) => (
          <li key={rule.name} className="border-t border-hairline pt-3">
            <h3 className="font-display text-base font-semibold uppercase tracking-wide">
              {rule.name}
            </h3>
            <p className="mt-0.5 text-sm leading-relaxed">{rule.trigger}</p>
            <p className="mt-1 font-mono text-[13px] text-linesman">
              confidence = {rule.formula}
            </p>
          </li>
        ))}
      </ul>

      <p className="mt-4 border-t border-hairline pt-3 text-xs leading-relaxed text-linesman">
        Deterministic rules, template narration. No machine learning, no language model,
        anywhere in the decision path.
      </p>
    </section>
  );
}
