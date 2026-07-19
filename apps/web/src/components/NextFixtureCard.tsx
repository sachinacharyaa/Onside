import { useEffect, useState } from "react";
import { formatCardDate, type UpcomingFixture } from "@/lib/matches";

function countdownParts(kickoffIso: string, nowMs: number) {
  const delta = Date.parse(kickoffIso) - nowMs;
  if (!Number.isFinite(delta) || delta <= 0) {
    return { label: "Kickoff window open", overdue: true as const };
  }
  const totalSec = Math.floor(delta / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  parts.push(`${hours}h`, `${mins}m`);
  return { label: parts.join(" "), overdue: false as const };
}

/**
 * Upcoming fixture card — real TxLINE metadata (+ odds when exposed).
 * Not a replay; no "Open live stage" that implies a finished match exists.
 */
export function NextFixtureCard({ fixture }: { fixture: UpcomingFixture }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  const kickoffLabel = formatCardDate(fixture.kickoffIso);
  const kickoffTime = new Date(fixture.kickoffIso).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
    hour12: false,
  });
  const countdown = countdownParts(fixture.kickoffIso, now);

  return (
    <article className="relative overflow-hidden rounded-3xl border border-caution/40 bg-panel shadow-[0_24px_80px_rgba(0,0,0,0.35)] ring-1 ring-caution/20">
      <img
        src={fixture.poster}
        alt=""
        className="absolute inset-0 h-full w-full object-cover object-center opacity-40"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-chalk via-chalk/92 to-chalk/55" aria-hidden />

      <div className="relative grid gap-6 p-6 sm:grid-cols-[1.2fr_0.8fr] sm:p-8 lg:items-center">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full border border-caution/50 bg-caution/15 px-3 py-1 text-sm font-medium tracking-wide text-caution">
              Next fixture
            </span>
            <span className="text-sm font-medium tracking-wide text-linesman">
              {fixture.competition}
            </span>
          </div>

          <h3 className="mt-4 font-display text-3xl font-semibold leading-snug tracking-tight text-ink sm:text-4xl">
            {fixture.home}
            <span className="mx-2 text-linesman">vs</span>
            {fixture.away}
          </h3>

          <p className="mt-3 text-sm leading-relaxed text-linesman sm:text-base">
            {kickoffLabel} · {kickoffTime} UTC · fixture {fixture.fixtureId}
          </p>

          <p className="mt-4 max-w-xl text-sm leading-relaxed text-ink/90 sm:text-[15px]">
            Onside will officiate this match live when it kicks off. No recorded replay, narration,
            or settlement exists yet — this card is fixture metadata only.
          </p>
        </div>

        <div className="rounded-2xl border border-hairline bg-chalk/80 p-5 backdrop-blur-sm">
          <p className="text-sm font-medium tracking-wide text-linesman">Countdown to kickoff</p>
          <p className="mt-2 font-display text-3xl font-semibold tracking-tight text-caution">
            {countdown.label}
          </p>

          {fixture.odds ? (
            <div className="mt-5">
              <p className="text-sm font-medium tracking-wide text-linesman">
                Pre-match 1X2 (TxLINE StablePrice)
              </p>
              <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg border border-hairline bg-panel px-2 py-2">
                  <dt className="text-xs text-linesman">{fixture.home}</dt>
                  <dd className="mt-1 font-display text-xl font-semibold text-turf">
                    {fixture.odds.home.toFixed(2)}
                  </dd>
                </div>
                <div className="rounded-lg border border-hairline bg-panel px-2 py-2">
                  <dt className="text-xs text-linesman">Draw</dt>
                  <dd className="mt-1 font-display text-xl font-semibold text-ink">
                    {fixture.odds.draw.toFixed(2)}
                  </dd>
                </div>
                <div className="rounded-lg border border-hairline bg-panel px-2 py-2">
                  <dt className="text-xs text-linesman">{fixture.away}</dt>
                  <dd className="mt-1 font-display text-xl font-semibold text-whistle">
                    {fixture.odds.away.toFixed(2)}
                  </dd>
                </div>
              </dl>
            </div>
          ) : (
            <p className="mt-5 text-sm leading-relaxed text-linesman">
              Pre-match odds not yet published on TxLINE for this fixture.
            </p>
          )}
        </div>
      </div>
    </article>
  );
}
