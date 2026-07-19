"use client";

import type { MatchMeta } from "@onside/ingestion";
import type { SettlementProof } from "@onside/settlement";
import { SealIcon } from "./Stamp";

export type SettlementStatus = "pending" | "settling" | "settled";

/**
 * The payoff: the official's full-time report. In play → PENDING;
 * at the final whistle the agent files it on-chain and this flips
 * to SETTLED with the devnet transaction as proof.
 */
export function FullTimeReport({
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
      ? `${meta.homeTeam} win`
      : proof?.finalOutcome === "away"
        ? `${meta.awayTeam} win`
        : "Draw";

  return (
    <section
      aria-label="Full-time report"
      className={`rounded-md border p-4 sm:p-5 ${
        status === "settled"
          ? "border-turf bg-turf/5"
          : status === "settling"
            ? "border-caution bg-caution/5"
            : "border-hairline bg-chalk-2/50"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <h2 className="font-display text-lg font-semibold uppercase tracking-wide">
          Full-time report
        </h2>
        {status === "settled" && (
          <span
            className="-rotate-3 rounded-sm border-2 border-turf px-2 py-0.5 font-display text-sm font-bold uppercase tracking-[0.15em] text-turf"
            aria-hidden="true"
          >
            Settled
          </span>
        )}
      </div>

      {status === "pending" && (
        <p className="mt-2 text-sm leading-relaxed text-linesman">
          In play — the agent settles its own market at the final whistle. No one else signs
          this report.
        </p>
      )}

      {status === "settling" && (
        <p className="mt-2 text-sm leading-relaxed">
          Final whistle. Submitting the settlement transaction to Solana devnet…
        </p>
      )}

      {status === "settled" && proof && (
        <div className="mt-2 space-y-2 text-sm leading-relaxed">
          <p className="flex items-center gap-2">
            <SealIcon className="h-5 w-5 shrink-0 text-turf" />
            <span>
              Report filed: <strong>{outcomeLabel}</strong>, settled by rule{" "}
              {proof.triggeringSignal.rule.replace(/_/g, " ").toLowerCase()} at{" "}
              {proof.triggeringSignal.confidence}% confidence.
            </span>
          </p>
          {proof.explorerUrl ? (
            <p>
              <a
                href={proof.explorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-turf underline decoration-turf/50 underline-offset-4 hover:decoration-turf focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-turf"
              >
                View the proof on Solana Explorer ↗
              </a>
            </p>
          ) : (
            <p className="text-linesman">
              Simulated settlement — add a funded devnet wallet to file this on-chain.
            </p>
          )}
          <p className="break-all font-mono text-xs text-linesman">tx {proof.txSignature}</p>
        </div>
      )}
    </section>
  );
}
