import { Link } from "react-router-dom";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

const FLOW = [
  {
    title: "Ingest",
    detail: "TxLINE live SSE or recorded historical replay → normalized MatchEvent stream",
  },
  {
    title: "Signal",
    detail: "Deterministic rules (ODDS_SWING, SCORE_CHANGE, TIME_DECAY_MISMATCH) — no ML",
  },
  {
    title: "Narrate",
    detail: "Template sentences explain every call in plain language as it happens",
  },
  {
    title: "Decide",
    detail: "Confidence ≥ threshold → act; below the bar → log only",
  },
  {
    title: "Settle",
    detail: "validateStat Merkle proof + Solana memo/Anchor settlement with Explorer link",
  },
] as const;

const TXLINE_ENDPOINTS = [
  {
    method: "POST",
    path: "/auth/guest/start",
    use: "Short-lived guest JWT for subsequent API calls",
  },
  {
    method: "POST",
    path: "/api/token/activate",
    use: "Activate long-lived API token after on-chain subscribe (World Cup free tier)",
  },
  {
    method: "GET",
    path: "/api/fixtures/snapshot",
    use: "List covered fixtures; pick TXLINE_FIXTURE_ID for live or recording",
  },
  {
    method: "GET",
    path: "/api/scores/snapshot/{fixtureId}",
    use: "Score history + game_finalised confirmation before settle / record",
  },
  {
    method: "GET",
    path: "/api/odds/snapshot/{fixtureId}",
    use: "Pre-match and in-play StablePrice 1X2 lines (e.g. next-fixture odds)",
  },
  {
    method: "GET",
    path: "/api/scores/stream",
    use: "Live SSE score feed (normalized into MatchEvent)",
  },
  {
    method: "GET",
    path: "/api/odds/stream",
    use: "Live SSE odds feed (throttled StablePrice ticks)",
  },
  {
    method: "GET",
    path: "/api/scores/historical/{fixtureId}",
    use: "Historical score records for finished fixtures → replay JSON",
  },
  {
    method: "GET",
    path: "/api/odds/updates/{epochDay}/{hour}/{interval}",
    use: "Historical odds buckets paired with recorded replays",
  },
  {
    method: "GET",
    path: "/api/scores/stat-validation?…",
    use: "Merkle proof inputs for on-chain validateStat before settlement",
  },
] as const;

const HIGHLIGHTS = [
  {
    label: "Glass box",
    body: "Every action traces to a named rule and a real match tick — no LLM, no opaque model.",
  },
  {
    label: "Same path live or replay",
    body: "TxLINE live and recorded fixtures share one MatchEvent interface; the UI never forks.",
  },
  {
    label: "On-chain proof",
    body: "Full-time settlement references TxLINE Merkle validation, then posts a Solana tx you can open in Explorer.",
  },
  {
    label: "Demo-ready",
    body: "Three finished World Cup replays plus an honest next-fixture card (metadata + odds only).",
  },
] as const;

/**
 * Brief technical documentation — core idea, architecture, TxLINE endpoints.
 */
export function DocsPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <main className="flex-1">
        <section className="border-b border-hairline bg-gradient-to-br from-turf/10 via-panel to-chalk">
          <div className="mx-auto max-w-6xl px-5 py-12 sm:px-8">
            <p className="text-sm font-medium tracking-wide text-turf">Brief technical documentation</p>
            <h1 className="mt-2 font-display text-4xl font-semibold leading-snug tracking-tight text-ink sm:text-5xl">
              Documentation
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-linesman sm:text-lg">
              How Onside thinks, what it proves on-chain, and which TxLINE endpoints power the feed.
            </p>
          </div>
        </section>

        <div className="mx-auto max-w-6xl space-y-16 px-5 py-12 sm:px-8">
          {/* Core idea */}
          <section>
            <h2 className="font-display text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
              Core idea
            </h2>
            <p className="mt-4 max-w-3xl text-base leading-relaxed text-linesman sm:text-[17px]">
              Onside is an autonomous settling agent for live World Cup markets (Solana Track 3). It
              watches a single match via{" "}
              <a
                href="https://txline.txodds.com"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-turf underline-offset-2 hover:underline"
              >
                TxLINE
              </a>
              , applies explicit deterministic rules, narrates every decision in plain language, and
              settles its own market on Solana — with Merkle-backed match data as proof. Humans
              configure thresholds; the agent runs the match without a black-box trader in the loop.
            </p>
          </section>

          {/* Highlights */}
          <section>
            <h2 className="font-display text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
              Business &amp; technical highlights
            </h2>
            <ul className="mt-8 grid gap-8 sm:grid-cols-2">
              {HIGHLIGHTS.map((h) => (
                <li key={h.label}>
                  <p className="text-sm font-medium tracking-wide text-caution">{h.label}</p>
                  <p className="mt-2 text-sm leading-relaxed text-linesman sm:text-[15px]">{h.body}</p>
                </li>
              ))}
            </ul>
          </section>

          {/* Architecture flow */}
          <section>
            <h2 className="font-display text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
              Architecture flow
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-linesman sm:text-base">
              One pipeline from feed to Explorer link. Live TxLINE and recorded replays enter through
              the same ingestion boundary.
            </p>

            <ol className="mt-10 space-y-0">
              {FLOW.map((step, i) => (
                <li key={step.title} className="relative flex gap-5 pb-8 last:pb-0 sm:gap-8">
                  {i < FLOW.length - 1 && (
                    <span
                      className="absolute left-[1.15rem] top-10 h-[calc(100%-1.5rem)] w-px bg-hairline sm:left-[1.4rem]"
                      aria-hidden
                    />
                  )}
                  <span className="relative z-[1] flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-turf/40 bg-turf/15 font-display text-sm font-semibold text-turf sm:h-11 sm:w-11 sm:text-base">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div className="min-w-0 pt-1">
                    <h3 className="font-display text-xl font-semibold tracking-tight text-ink">
                      {step.title}
                    </h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-linesman sm:text-[15px]">
                      {step.detail}
                    </p>
                  </div>
                </li>
              ))}
            </ol>

            <pre className="mt-10 overflow-x-auto rounded-2xl border border-hairline bg-panel/80 p-5 font-mono text-[11px] leading-relaxed text-linesman sm:text-xs">
{`TxLINE feed / replay ─▶ Signal Engine ─▶ Narration Engine ─▶ Live Feed UI (SSE)
      (ingestion)          (rules, no ML)    (templates, no ML)
                                │
                                ▼
                         Decision Layer ─▶ On-chain Settler (Solana + validateStat)`}
            </pre>
          </section>

          {/* TxLINE endpoints */}
          <section>
            <h2 className="font-display text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
              TxLINE endpoints used
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-linesman sm:text-base">
              Hosted on the TxLINE World Cup free tier (
              <code className="font-mono text-xs text-caution">txline-dev.txodds.com</code> / mainnet
              host). Auth is guest JWT + activated API token.
            </p>

            <div className="mt-8 overflow-x-auto">
              <table className="w-full min-w-[36rem] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-hairline">
                    <th className="py-3 pr-4 font-medium text-linesman">Method</th>
                    <th className="py-3 pr-4 font-medium text-linesman">Endpoint</th>
                    <th className="py-3 font-medium text-linesman">Used for</th>
                  </tr>
                </thead>
                <tbody>
                  {TXLINE_ENDPOINTS.map((ep) => (
                    <tr key={ep.path} className="border-b border-hairline/70 align-top">
                      <td className="py-3.5 pr-4 font-mono text-xs text-turf">{ep.method}</td>
                      <td className="py-3.5 pr-4 font-mono text-xs text-ink sm:text-[13px]">
                        {ep.path}
                      </td>
                      <td className="py-3.5 text-linesman">{ep.use}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-4 text-sm text-linesman">
              On-chain companion: TxLINE program{" "}
              <code className="font-mono text-xs text-caution">validateStat</code> (simulated via RPC)
              binds settlement to the fixture&apos;s final seq.
            </p>
          </section>

          <div className="flex flex-wrap gap-4 border-t border-hairline pt-10">
            <Link
              to="/rulebook"
              className="inline-flex min-h-12 items-center justify-center rounded-full border border-hairline bg-panel px-6 py-3 text-sm font-semibold text-ink transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-turf"
            >
              Open rulebook
            </Link>
            <Link
              to="/live"
              className="inline-flex min-h-12 items-center justify-center rounded-full bg-turf px-6 py-3 text-sm font-semibold text-chalk transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-turf"
            >
              Watch a replay →
            </Link>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
