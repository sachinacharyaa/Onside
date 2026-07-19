import { Link } from "react-router-dom";
import { rulesConfig } from "@onside/signal-engine";
import { Rulebook } from "@/components/Rulebook";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

export function RulebookPage() {
  const threshold = rulesConfig.decision.settleThreshold;

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <main className="flex-1">
        <section className="border-b border-hairline bg-gradient-to-br from-turf/10 via-panel to-chalk">
          <div className="mx-auto max-w-6xl px-5 py-12 sm:px-8">
            <p className="font-display text-sm font-semibold uppercase tracking-[0.2em] text-turf">
              Auditable before it trades
            </p>
            <h1 className="mt-2 font-display text-4xl font-bold uppercase tracking-tight text-ink sm:text-5xl">
              The rulebook
            </h1>
            <p className="mt-3 max-w-2xl text-lg text-linesman">
              These are the exact thresholds Onside runs on. Change them in{" "}
              <code className="font-mono text-sm text-caution">rules.config.ts</code> — nowhere
              else. The agent acts only above {threshold}% confidence.
            </p>
          </div>
        </section>

        <div className="mx-auto grid max-w-6xl gap-8 px-5 py-10 lg:grid-cols-5 lg:px-8">
          <div className="lg:col-span-3">
            <Rulebook settleThreshold={threshold} />
          </div>
          <aside className="space-y-6 lg:col-span-2">
            <div className="rounded-2xl border border-hairline bg-panel p-5">
              <h2 className="font-display text-lg font-semibold uppercase tracking-wide">
                How to read a call
              </h2>
              <ul className="mt-3 space-y-3 text-sm leading-relaxed text-linesman">
                <li>
                  <strong className="text-ink">Stamp seal</strong> — the agent cleared the bar and
                  acted.
                </li>
                <li>
                  <strong className="text-ink">Dim entry, no stamp</strong> — signal logged, no
                  trade. Below {threshold}% or hold.
                </li>
                <li>
                  <strong className="text-ink">Rotated card</strong> — real yellow/red card on the
                  pitch only.
                </li>
                <li>
                  <strong className="text-turf">Turf</strong> = home ·{" "}
                  <strong className="text-whistle">Whistle</strong> = away · muted = match-wide.
                </li>
              </ul>
            </div>
            <Link
              to="/live"
              className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-turf px-6 py-3 font-display text-sm font-bold uppercase tracking-wider text-chalk transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-turf"
            >
              Watch it apply these rules →
            </Link>
          </aside>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
