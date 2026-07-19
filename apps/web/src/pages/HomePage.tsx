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
import { NextFixtureCard } from "@/components/NextFixtureCard";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { FEATURED, NEXT_FIXTURE, formatCardDate } from "@/lib/matches";

/**
 * One continuous landing composition — no section borders.
 * Tall, visual, icon-led; flows as a single page.
 */
export function HomePage() {
  const [hero] = FEATURED;

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

            {/* Featured match — real match photo background */}
            <Link
              to={`/live?match=${hero.id}`}
              className="hero-rise-delay group relative block min-h-[22rem] overflow-hidden rounded-3xl shadow-[0_24px_80px_rgba(0,0,0,0.45)] ring-1 ring-white/10 transition-transform hover:scale-[1.01] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-turf sm:min-h-[26rem]"
            >
              <img
                src={hero.poster}
                alt=""
                className="absolute inset-0 h-full w-full object-cover object-center transition-transform duration-700 group-hover:scale-105"
              />
              <div
                className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/25 to-transparent"
                aria-hidden
              />
              <div
                className="absolute inset-x-0 bottom-0 h-[55%] bg-gradient-to-t from-black/95 via-black/65 to-transparent"
                aria-hidden
              />

              <div className="relative flex h-full min-h-[22rem] flex-col justify-between p-6 sm:min-h-[26rem] sm:p-8">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium tracking-wide text-turf drop-shadow">
                      {hero.tag}
                    </p>
                    <p className="mt-1 text-sm text-white/75 drop-shadow">
                      {formatCardDate(hero.kickoffIso)} · {hero.competition}
                    </p>
                    <p className="mt-1 font-display text-lg font-semibold text-white/90 drop-shadow">
                      FT {hero.finalScore}
                    </p>
                  </div>
                  <MatchCrest
                    home={hero.home}
                    away={hero.away}
                    accent={hero.accent}
                    className="h-20 w-20 drop-shadow-lg"
                  />
                </div>

                <div>
                  <h2 className="font-display text-3xl font-semibold leading-snug tracking-tight text-white drop-shadow sm:text-4xl">
                    {hero.home}
                    <span className="mx-2 text-white/50">vs</span>
                    <span className="block sm:inline">{hero.away}</span>
                  </h2>
                  <p className="mt-4 max-w-md text-sm leading-relaxed text-white/90 drop-shadow sm:text-base">
                    {hero.blurb}
                  </p>
                  <div className="mt-8 flex flex-wrap items-end justify-between gap-4">
                    <div className="flex gap-6">
                      <LeanDot label={hero.home} pct={hero.homeLean} tone="turf" />
                      <LeanDot label={hero.away} pct={hero.awayLean} tone="whistle" />
                    </div>
                    <span className="text-sm font-semibold text-turf drop-shadow group-hover:underline">
                      Enter live stage →
                    </span>
                  </div>
                  <p className="mt-3 text-[11px] text-white/45">{hero.posterCredit}</p>
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

          {/* Next real fixture — not a replay */}
          <div className="mt-20 sm:mt-28">
            <p className="text-sm font-medium tracking-wide text-caution">Coming up</p>
            <h2 className="mt-2 font-display text-3xl font-semibold leading-snug tracking-tight">
              Next fixture on TxLINE
            </h2>
            <div className="mt-8">
              <NextFixtureCard fixture={NEXT_FIXTURE} />
            </div>
          </div>

          {/* Match picker — recorded finished fixtures only */}
          <div className="mt-20 sm:mt-28">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-sm font-medium tracking-wide text-linesman">Choose a replay</p>
                <h2 className="mt-2 font-display text-3xl font-semibold leading-snug tracking-tight">
                  Three finished World Cup matches
                </h2>
                <p className="mt-2 max-w-xl text-sm leading-relaxed text-linesman">
                  Real TxLINE historical feeds, most recent first. Each settles with Merkle
                  validation on the fixture&apos;s final seq.
                </p>
              </div>
              <IconBall className="h-12 w-12 text-turf/40" />
            </div>

            <ul className="mt-10 grid gap-8 sm:grid-cols-3">
              {FEATURED.map((m) => (
                <li key={m.id}>
                  <Link
                    to={`/live?match=${m.id}`}
                    className="group relative flex h-full min-h-[18rem] flex-col overflow-hidden rounded-3xl transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-turf"
                  >
                    <img
                      src={m.poster}
                      alt=""
                      className="absolute inset-0 h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
                    />
                    <div
                      className="absolute inset-0 bg-gradient-to-b from-black/75 via-black/20 to-transparent"
                      aria-hidden
                    />
                    <div
                      className="absolute inset-x-0 bottom-0 h-[58%] bg-gradient-to-t from-black/95 via-black/70 to-transparent"
                      aria-hidden
                    />

                    <div className="relative flex h-full flex-col p-6">
                      <p className="text-sm font-medium tracking-wide text-white/80 drop-shadow">
                        {formatCardDate(m.kickoffIso)}
                      </p>
                      <p
                        className={`mt-1 text-sm font-medium tracking-wide drop-shadow ${
                          m.accent === "whistle"
                            ? "text-whistle"
                            : m.accent === "caution"
                              ? "text-caution"
                              : "text-turf"
                        }`}
                      >
                        {m.competition}
                      </p>
                      <h3 className="mt-auto font-display text-2xl font-semibold leading-snug tracking-tight text-white drop-shadow">
                        {m.home}
                        <span className="mx-1.5 text-white/50">vs</span>
                        {m.away}
                      </h3>
                      <p className="mt-2 font-display text-lg font-semibold text-caution drop-shadow">
                        FT {m.finalScore}
                      </p>
                      <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-white/85 drop-shadow">
                        {m.blurb}
                      </p>
                      <span className="mt-5 text-sm font-semibold text-turf drop-shadow group-hover:underline">
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
              to={`/live?match=${hero.id}`}
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
