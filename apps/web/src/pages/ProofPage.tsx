import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { SettlementProof } from "@onside/settlement";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

const SESSION_KEY = "onside:last-settlement";

/**
 * Dedicated Proof page for demos: TxLINE Merkle verification + our settlement tx.
 * Both Explorer links must be independently labeled and clickable.
 */
export function ProofPage() {
  const [proof, setProof] = useState<SettlementProof | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/settlement/latest");
        const data = (await res.json()) as { proof: SettlementProof | null };
        if (!cancelled && data.proof) {
          setProof(data.proof);
          setLoading(false);
          return;
        }
      } catch {
        /* fall through to session */
      }
      try {
        const raw = sessionStorage.getItem(SESSION_KEY);
        if (raw && !cancelled) {
          setProof(JSON.parse(raw) as SettlementProof);
        }
      } catch {
        if (!cancelled) setError("Could not load a settlement proof yet.");
      }
      if (!cancelled) setLoading(false);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const outcome =
    proof?.finalOutcome === "home"
      ? "Home win"
      : proof?.finalOutcome === "away"
        ? "Away win"
        : proof?.finalOutcome === "draw"
          ? "Draw"
          : null;

  const isFraEngDemo =
    proof?.matchId === "txline-18257865" ||
    proof?.txline?.fixtureId === 18257865;

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <main className="flex-1">
        <section className="border-b border-hairline bg-gradient-to-br from-turf/10 via-panel to-chalk">
          <div className="mx-auto max-w-6xl px-5 py-12 sm:px-8">
            <p className="text-sm font-medium tracking-wide text-turf">On-chain proof</p>
            <h1 className="mt-2 font-display text-4xl font-semibold leading-snug tracking-tight text-ink sm:text-5xl">
              Settlement receipt
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-linesman sm:text-lg">
              Verified against TxLINE&apos;s on-chain Merkle root, then filed as our own settlement
              transaction. Two separate Solana transactions — sponsor validation, then agent
              settlement — anyone can re-check independently.
            </p>
            {isFraEngDemo && (
              <p className="mt-3 text-sm font-medium text-ink">
                France vs England · World Cup 2026 3rd Place Final · fixture 18257865
              </p>
            )}
          </div>
        </section>

        <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
          {loading && <p className="text-linesman">Loading latest settlement…</p>}

          {!loading && !proof && (
            <div className="rounded-2xl border border-hairline bg-panel p-6 shadow-[0_8px_28px_rgba(24,38,32,0.06)]">
              <h2 className="font-display text-2xl font-semibold tracking-tight">No proof yet</h2>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-linesman">
                Run the primary France vs England demo to the final whistle. When the agent settles,
                this page shows both the TxLINE validateStat tx and the agent settlement tx.
              </p>
              <Link
                to="/live?match=fra-eng-3rd"
                className="mt-6 inline-flex min-h-12 items-center rounded-full bg-turf px-6 py-3 text-sm font-semibold text-chalk hover:opacity-90"
              >
                Open primary demo →
              </Link>
            </div>
          )}

          {!loading && proof && (
            <div className="space-y-6">
              {proof.txline?.onChainViewPassed && (
                <div className="rounded-2xl border border-caution/50 bg-caution/10 p-6 shadow-[0_8px_28px_rgba(24,38,32,0.06)]">
                  <p className="text-sm font-medium tracking-wide text-caution">
                    1 · TxLINE on-chain Merkle verification
                  </p>
                  <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-ink">
                    validateStat transaction
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-ink">
                    Proven score {proof.txline.homeGoals}–{proof.txline.awayGoals} for fixture{" "}
                    {proof.txline.fixtureId}, seq {proof.txline.seq} (game finalised).
                  </p>
                  <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div>
                      <dt className="text-xs font-medium tracking-wide text-linesman">Method</dt>
                      <dd className="mt-1 font-mono text-sm">{proof.txline.method}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium tracking-wide text-linesman">
                        Daily scores PDA
                      </dt>
                      <dd className="mt-1 break-all font-mono text-xs text-linesman">
                        {proof.txline.dailyScoresPda}
                      </dd>
                    </div>
                  </dl>

                  {proof.txline.validationExplorerUrl ? (
                    <a
                      href={proof.txline.validationExplorerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-6 inline-flex min-h-12 items-center rounded-full border-2 border-caution bg-panel px-6 py-3 text-sm font-semibold text-ink hover:bg-caution/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-caution"
                    >
                      Open TxLINE validateStat tx on Explorer ↗
                    </a>
                  ) : (
                    <p className="mt-4 text-sm text-whistle">
                      Validation Explorer link missing from this proof payload.
                    </p>
                  )}
                  {proof.txline.validationTxSignature && (
                    <p className="mt-3 break-all font-mono text-xs text-linesman">
                      {proof.txline.validationTxSignature}
                    </p>
                  )}
                </div>
              )}

              <div className="rounded-2xl border border-turf/50 bg-turf/10 p-6 shadow-[0_8px_28px_rgba(24,38,32,0.06)]">
                <p className="text-sm font-medium tracking-wide text-turf">
                  2 · Agent settlement on Solana
                </p>
                <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight text-ink">
                  {outcome}
                </h2>
                <dl className="mt-6 grid gap-4 sm:grid-cols-2">
                  <div>
                    <dt className="text-xs font-medium tracking-wide text-linesman">Match id</dt>
                    <dd className="mt-1 font-mono text-sm text-ink">{proof.matchId}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium tracking-wide text-linesman">Mode</dt>
                    <dd className="mt-1 text-sm text-ink">{proof.mode}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium tracking-wide text-linesman">Rule</dt>
                    <dd className="mt-1 text-sm text-ink">
                      {proof.triggeringSignal.rule}, {proof.triggeringSignal.confidence}%
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium tracking-wide text-linesman">Settled at</dt>
                    <dd className="mt-1 text-sm text-ink">{proof.settledAt}</dd>
                  </div>
                </dl>

                <a
                  href={proof.explorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-8 inline-flex min-h-12 items-center rounded-full bg-turf px-6 py-3 text-sm font-semibold text-chalk hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-turf"
                >
                  Open agent settlement tx on Explorer ↗
                </a>
                <p className="mt-3 break-all font-mono text-xs text-linesman">
                  {proof.txSignature}
                </p>
              </div>

              {error && <p className="text-sm text-whistle">{error}</p>}

              <Link
                to="/live?match=fra-eng-3rd"
                className="text-sm font-medium text-turf underline underline-offset-4"
              >
                Back to live stage →
              </Link>
            </div>
          )}
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
