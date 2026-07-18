"use client";

import type { MatchMeta } from "@onside/ingestion";
import type { SettlementProof } from "@onside/settlement";

export type SettlementStatus = "pending" | "settling" | "settled";

/**
 * Bottom status card: PENDING while the match runs, then flips to SETTLED
 * with a clickable devnet Explorer link — the on-chain proof moment.
 */
export function SettlementCard({
  status,
  proof,
  meta,
}: {
  status: SettlementStatus;
  proof: SettlementProof | null;
  meta: MatchMeta;
}) {
  const outcomeLabel =
    proof?.finalOutcome === "home"
      ? meta.homeTeam
      : proof?.finalOutcome === "away"
        ? meta.awayTeam
        : proof?.finalOutcome === "draw"
          ? "Draw"
          : null;

  return (
    <div className="rounded-xl border border-line bg-pitch-900/70 px-5 py-4">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-chalk-dim">
          On-chain settlement
        </h2>

        {status === "pending" && (
          <span className="inline-flex items-center gap-2 rounded-full border border-slate-500/40 bg-slate-500/10 px-3 py-1 font-mono text-xs font-semibold text-slate-300">
            <span className="pulse-dot h-2 w-2 rounded-full bg-slate-400" /> PENDING — match in play
          </span>
        )}
        {status === "settling" && (
          <span className="inline-flex items-center gap-2 rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 font-mono text-xs font-semibold text-amber-300">
            <span className="pulse-dot h-2 w-2 rounded-full bg-amber-400" /> SETTLING — submitting
            transaction…
          </span>
        )}
        {status === "settled" && proof && (
          <>
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 font-mono text-xs font-semibold text-emerald-300">
              ✓ SETTLED — {outcomeLabel}
            </span>
            {proof.explorerUrl ? (
              <a
                href={proof.explorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-xs text-sky-300 underline decoration-sky-500/50 underline-offset-4 hover:text-sky-200"
              >
                View proof on Solana Explorer (devnet) ↗
              </a>
            ) : (
              <span className="font-mono text-xs text-chalk-dim">
                simulated mode — set AGENT_WALLET_SECRET_KEY for a real devnet tx
              </span>
            )}
          </>
        )}
      </div>

      {status === "settled" && proof && (
        <p className="mt-2 break-all font-mono text-xs text-chalk-dim">
          tx: {proof.txSignature} · mode: {proof.mode} · triggered by {proof.triggeringSignal.rule}{" "}
          @ {proof.triggeringSignal.confidence}%
        </p>
      )}
    </div>
  );
}
