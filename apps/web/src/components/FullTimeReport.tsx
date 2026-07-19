import type { MatchMeta } from "@onside/ingestion";
import type { SettlementProof } from "@onside/settlement";
import { SealIcon } from "./Stamp";

export type SettlementStatus = "pending" | "settling" | "settled" | "failed";

/**
 * The payoff: the official's full-time report. In play → PENDING;
 * at the final whistle the agent files it on-chain and this flips
 * to SETTLED with the devnet transaction as proof.
 */
export function FullTimeReport({
  status,
  proof,
  meta,
  errorMessage,
  onRetry,
}: {
  status: SettlementStatus;
  proof: SettlementProof | null;
  meta: MatchMeta;
  errorMessage?: string | null;
  onRetry?: () => void;
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
      className={`rounded-2xl border p-4 sm:p-5 ${
        status === "settled"
          ? "border-turf bg-turf/10 shadow-[0_0_40px_var(--color-glow)]"
          : status === "settling"
            ? "border-caution bg-caution/10"
            : status === "failed"
              ? "border-whistle bg-whistle/10"
              : "border-hairline bg-panel/80"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <h2 className="font-display text-xl font-semibold tracking-tight">Full-time report</h2>
        {status === "settled" && (
          <span
            className="-rotate-3 rounded-sm border-2 border-turf px-2 py-0.5 text-sm font-semibold text-turf"
            aria-hidden="true"
          >
            Settled
          </span>
        )}
        {status === "failed" && (
          <span
            className="rounded-sm border-2 border-whistle px-2 py-0.5 text-sm font-semibold text-whistle"
            aria-hidden="true"
          >
            Failed
          </span>
        )}
      </div>

      {status === "pending" && (
        <p className="mt-2 text-sm leading-relaxed text-linesman">
          In play. The agent settles its own market at the final whistle. No one else signs this
          report.
        </p>
      )}

      {status === "settling" && (
        <p className="mt-2 text-sm leading-relaxed">
          Final whistle. Submitting the settlement transaction to Solana devnet…
        </p>
      )}

      {status === "failed" && (
        <div className="mt-2 space-y-3 text-sm leading-relaxed">
          <p className="text-whistle">
            Settlement failed{errorMessage ? `: ${errorMessage}` : "."} No fake proof was written.
            Fund the agent wallet and retry.
          </p>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex min-h-10 items-center rounded-full bg-whistle px-4 py-1.5 text-sm font-semibold text-chalk hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-whistle"
            >
              Retry settlement
            </button>
          )}
        </div>
      )}

      {status === "settled" && proof && (
        <div className="mt-2 space-y-2 text-sm leading-relaxed">
          <p className="flex items-center gap-2">
            <SealIcon className="h-5 w-5 shrink-0 text-turf" />
            <span>
              Report filed: <strong>{outcomeLabel}</strong>, settled by rule{" "}
              {proof.triggeringSignal.rule.replace(/_/g, " ").toLowerCase()} at{" "}
              {proof.triggeringSignal.confidence}% confidence ({proof.mode}).
            </span>
          </p>
          {proof.txline?.onChainViewPassed && (
            <p className="text-caution">
              Verified against TxLINE&apos;s on-chain Merkle root (fixture{" "}
              {proof.txline.fixtureId}, seq {proof.txline.seq}, score{" "}
              {proof.txline.homeGoals}–{proof.txline.awayGoals}).
            </p>
          )}
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
          <p className="break-all font-mono text-xs text-linesman">tx {proof.txSignature}</p>
        </div>
      )}
    </section>
  );
}
