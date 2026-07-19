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
      formula: `goal ${rulesConfig.SCORE_CHANGE.goalConfidence}, red card ${rulesConfig.SCORE_CHANGE.redCardConfidence}, full-time 100`,
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
      className="rounded-2xl border border-hairline bg-panel p-4 shadow-[0_8px_28px_rgba(24,38,32,0.06)] sm:p-5"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-xl font-semibold tracking-tight">The rulebook</h2>
        <p className="text-sm font-medium text-turf">
          Acts only above {settleThreshold}% confidence
        </p>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-linesman">
        Every threshold the agent uses, read live from{" "}
        <code className="font-mono text-[13px] text-ink">rules.config.ts</code>. Nothing else
        decides.
      </p>

      <ul className="mt-4 space-y-4">
        {rules.map((rule) => (
          <li key={rule.name} className="border-t border-hairline pt-3">
            <h3 className="font-display text-lg font-semibold tracking-tight">{rule.name}</h3>
            <p className="mt-1 text-sm leading-relaxed">{rule.trigger}</p>
            <p className="mt-1 font-mono text-[13px] text-linesman">
              confidence = {rule.formula}
            </p>
          </li>
        ))}
      </ul>

      <p className="mt-4 border-t border-hairline pt-3 text-sm leading-relaxed text-linesman">
        Deterministic rules, template narration. No machine learning, no language model, anywhere
        in the decision path.
      </p>
    </section>
  );
}
