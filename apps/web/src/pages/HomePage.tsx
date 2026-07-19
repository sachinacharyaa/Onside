import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  IconBall,
  IconBook,
  IconChainSettle,
  IconPitch,
  IconRadar,
  IconWhistleCall,
  MatchCrest,
} from "@/components/LandingIcons";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { FEATURED } from "@/lib/matches";

/**
 * One continuous landing composition — no section borders.
 * Tall, visual, icon-led; flows as a single page.
 */
export function HomePage() {
  const [hero, ...rest] = FEATURED;

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <main className="relative flex-1 overflow-hidden">
        {/* Soft pitch wash — one atmosphere for the whole page */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          aria-hidden
          style={{
            backgroundImage: `
              linear-gradient(90deg, transparent 0%, transparent 48%, var(--color-ink) 49%, var(--color-ink) 51%, transparent 52%),
              repeating-linear-gradient(0deg, transparent, transparent 64px, var(--color-ink) 65px)
            `,
          }}
        />

        <div className="relative mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-14 lg:py-16">
          {/* Hero */}
          <div className="hero-rise grid items-center gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:min-h-[70vh] lg:gap-14">
            <div>
              <div className="mb-6 flex items-center gap-3 text-turf">
                <IconPitch className="h-10 w-14" />
                <span className="text-sm font-medium tracking-wide">Onside Settling Agent</span>
              </div>

              <h1 className="font-display text-[clamp(2.15rem,5.2vw,3.65rem)] font-semibold leading-[1.12] tracking-tight">
                <span className="block whitespace-nowrap">Glass box calls.</span>
                <span className="mt-1 block whitespace-nowrap text-turf">onChain proof.</span>
              </h1>

              <p className="mt-6 max-w-lg text-base leading-relaxed text-linesman sm:text-lg">
                Watch a World Cup match. Named rules fire in plain language. At the final whistle
                the agent settles itself on Solana. Nothing hidden, no AI in the path.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  to={`/live?match=${hero.id}`}
                  className="inline-flex min-h-12 items-center gap-2 rounded-full bg-turf px-7 py-3 text-sm font-semibold text-chalk hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-turf"
                >
                  <IconBall className="h-5 w-5" />
                  Watch the agent
                </Link>
                <Link
                  to="/rulebook"
                  className="inline-flex min-h-12 items-center gap-2 rounded-full bg-ink/10 px-7 py-3 text-sm font-semibold text-ink ring-1 ring-ink/20 hover:bg-ink/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-turf"
                >
                  <IconBook className="h-5 w-5 text-caution" />
                  Open rulebook
                </Link>
              </div>
            </div>

            {/* Featured match — typographic crest only (no stock photography) */}
            <Link
              to={`/live?match=${hero.id}`}
              className="hero-rise-delay group relative block min-h-[22rem] overflow-hidden rounded-3xl bg-panel shadow-[0_16px_48px_rgba(24,38,32,0.12)] ring-1 ring-hairline transition-transform hover:scale-[1.01] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-turf sm:min-h-[26rem]"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-turf/15 via-panel to-chalk-2" />
              <div className="relative flex h-full min-h-[22rem] flex-col justify-between p-8 sm:min-h-[26rem]">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium tracking-wide text-turf">{hero.tag}</p>
                    <p className="mt-1 text-sm text-linesman">{hero.competition}</p>
                  </div>
                  <MatchCrest
                    home={hero.home}
                    away={hero.away}
                    accent={hero.accent}
                    className="h-24 w-24"
                  />
                </div>

                <div>
                  <h2 className="font-display text-3xl font-semibold leading-snug tracking-tight text-ink sm:text-4xl">
                    {hero.home}
                    <span className="mx-2 text-linesman">vs</span>
                    <span className="block sm:inline">{hero.away}</span>
                  </h2>
                  <p className="mt-4 max-w-md text-sm leading-relaxed text-linesman sm:text-base">
                    {hero.blurb}
                  </p>
                  <div className="mt-8 flex flex-wrap items-end justify-between gap-4">
                    <div className="flex gap-6">
                      <LeanDot label={hero.home} pct={hero.homeLean} tone="turf" />
                      <LeanDot label={hero.away} pct={hero.awayLean} tone="whistle" />
                    </div>
                    <span className="text-sm font-semibold text-turf group-hover:underline">
                      Enter live stage →
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          </div>

          {/* Pipeline */}
          <div id="how-it-works" className="mt-20 sm:mt-28">
            <p className="text-sm font-medium tracking-wide text-linesman">
              Three steps, fully deterministic
            </p>
            <h2 className="mt-2 font-display text-3xl font-semibold leading-snug tracking-tight sm:text-4xl">
              How the official works
            </h2>

            <ol className="mt-10 grid gap-10 sm:grid-cols-3 sm:gap-8">
              <Step
                icon={<IconRadar className="h-14 w-14 text-turf" />}
                n="01"
                title="Ingest"
                body="TxLINE scores and odds, or a recorded replay, enter through one shared interface. Live and demo use the same path."
              />
              <Step
                icon={<IconWhistleCall className="h-14 w-14 text-caution" />}
                n="02"
                title="Call"
                body="Named rules fire with a confidence score. Clear 80% and the agent stamps the log. Below the bar, it only notes."
              />
              <Step
                icon={<IconChainSettle className="h-14 w-14 text-whistle" />}
                n="03"
                title="Settle"
                body="At the final whistle Onside files its own full-time report on Solana. The Explorer link is the proof."
              />
            </ol>
          </div>

          {/* Match picker */}
          <div className="mt-20 sm:mt-28">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-sm font-medium tracking-wide text-linesman">Choose a replay</p>
                <h2 className="mt-2 font-display text-3xl font-semibold leading-snug tracking-tight">
                  Three World Cup scripts
                </h2>
              </div>
              <IconBall className="h-12 w-12 text-turf/40" />
            </div>

            <ul className="mt-10 grid gap-8 sm:grid-cols-3">
              {FEATURED.map((m) => (
                <li key={m.id}>
                  <Link
                    to={`/live?match=${m.id}`}
                    className="group relative flex h-full min-h-[18rem] flex-col overflow-hidden rounded-3xl bg-panel shadow-[0_8px_28px_rgba(24,38,32,0.08)] ring-1 ring-hairline transition-all hover:ring-turf/35 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-turf"
                  >
                    <div className="relative flex h-full flex-col p-6">
                      <MatchCrest
                        home={m.home}
                        away={m.away}
                        accent={m.accent}
                        className="h-28 w-28 self-center"
                      />
                      <p
                        className={`mt-auto text-center text-sm font-medium tracking-wide ${
                          m.accent === "whistle"
                            ? "text-whistle"
                            : m.accent === "caution"
                              ? "text-caution"
                              : "text-turf"
                        }`}
                      >
                        {m.tag}
                      </p>
                      <h3 className="mt-2 text-center font-display text-2xl font-semibold leading-snug tracking-tight">
                        {m.home}
                        <span className="mx-1.5 text-linesman">vs</span>
                        {m.away}
                      </h3>
                      <p className="mt-3 flex-1 text-center text-sm leading-relaxed text-linesman">
                        {m.blurb}
                      </p>
                      <span className="mt-5 text-center text-sm font-semibold text-turf group-hover:underline">
                        Open live stage →
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Pitch close */}
          <div
            id="proof"
            className="mt-20 flex flex-col items-start gap-6 pb-8 sm:mt-28 sm:flex-row sm:items-end sm:justify-between"
          >
            <div className="max-w-2xl">
              <p className="text-sm font-medium tracking-wide text-caution">Track 3</p>
              <blockquote className="mt-3 font-display text-2xl font-semibold leading-snug tracking-tight sm:text-3xl">
                Every other agent is a black box that trades. Ours shows its work and settles its
                own market onChain.
              </blockquote>
            </div>
            <Link
              to={`/live?match=${rest[0]?.id ?? hero.id}`}
              className="inline-flex min-h-12 shrink-0 items-center gap-2 rounded-full bg-turf px-7 py-3 text-sm font-semibold text-chalk hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-turf"
            >
              <IconWhistleCall className="h-5 w-5" />
              Start the demo
            </Link>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}

function Step({
  icon,
  n,
  title,
  body,
}: {
  icon: ReactNode;
  n: string;
  title: string;
  body: string;
}) {
  return (
    <li className="flex flex-col">
      <div className="mb-4">{icon}</div>
      <p className="text-sm font-medium tracking-wide text-linesman">{n}</p>
      <h3 className="mt-1 font-display text-2xl font-semibold leading-snug tracking-tight">
        {title}
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-linesman sm:text-base">{body}</p>
    </li>
  );
}

function LeanDot({
  label,
  pct,
  tone,
}: {
  label: string;
  pct: number;
  tone: "turf" | "whistle";
}) {
  return (
    <div>
      <p className="text-xs font-medium tracking-wide text-linesman">{label}</p>
      <p
        className={`font-display text-2xl font-semibold tabular-nums ${
          tone === "turf" ? "text-turf" : "text-whistle"
        }`}
      >
        {pct}%
      </p>
    </div>
  );
}
