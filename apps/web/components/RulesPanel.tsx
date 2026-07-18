"use client";

import { rulesConfig } from "@onside/signal-engine";

/**
 * Renders the exact live thresholds from rules.config.ts — the
 * "auditable, not black-box" pitch, on screen at all times.
 */
export function RulesPanel({ settleThreshold }: { settleThreshold: number }) {
  const rows: { rule: string; trigger: string; formula: string }[] = [
    {
      rule: "ODDS_SWING",
      trigger: `implied prob moves ≥ ${rulesConfig.ODDS_SWING.minDeltaPts}pts within ${rulesConfig.ODDS_SWING.windowSeconds}s`,
      formula: `min(100, |Δ| × ${rulesConfig.ODDS_SWING.confidencePerPoint})`,
    },
    {
      rule: "SCORE_CHANGE",
      trigger: "goal / red card / full-time",
      formula: `goal ${rulesConfig.SCORE_CHANGE.goalConfidence} · red ${rulesConfig.SCORE_CHANGE.redCardConfidence} · FT 100`,
    },
    {
      rule: "TIME_DECAY_MISMATCH",
      trigger: `leader diverges ≥ ${rulesConfig.TIME_DECAY_MISMATCH.minDeviationPts}pts from decay curve`,
      formula: `min(100, dev × ${rulesConfig.TIME_DECAY_MISMATCH.confidencePerPoint})`,
    },
  ];

  return (
    <div className="rounded-xl border border-line bg-pitch-900/70 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-chalk-dim">
          Live rules — no black box
        </h2>
        <span className="rounded border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 font-mono text-[11px] text-emerald-300">
          act ≥ {settleThreshold}%
        </span>
      </div>
      <table className="w-full text-left text-xs">
        <thead>
          <tr className="text-chalk-dim">
            <th className="pb-2 pr-3 font-medium">Rule</th>
            <th className="pb-2 pr-3 font-medium">Trigger</th>
            <th className="pb-2 font-medium">Confidence</th>
          </tr>
        </thead>
        <tbody className="align-top">
          {rows.map((r) => (
            <tr key={r.rule} className="border-t border-line">
              <td className="py-2 pr-3 font-mono text-[11px] text-chalk">{r.rule}</td>
              <td className="py-2 pr-3 text-chalk-dim">{r.trigger}</td>
              <td className="py-2 font-mono text-[11px] text-chalk-dim">{r.formula}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-3 text-[11px] leading-relaxed text-chalk-dim">
        Every threshold above is read live from <code className="text-chalk">rules.config.ts</code>.
        Deterministic rules, template narration — no ML, no LLM, anywhere.
      </p>
    </div>
  );
}
