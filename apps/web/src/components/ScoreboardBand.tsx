import type { MatchEvent, MatchMeta } from "@onside/ingestion";

/** Full-bleed ink scoreboard band — Match Official chalk & turf system. */
export function ScoreboardBand({
  meta,
  lastEvent,
  live,
}: {
  meta: MatchMeta;
  lastEvent: MatchEvent | null;
  live: boolean;
}) {
  const scoreHome = lastEvent?.scoreHome ?? 0;
  const scoreAway = lastEvent?.scoreAway ?? 0;

  return (
    <section aria-label="Scoreboard" className="border-y border-ink bg-ink text-chalk">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-8 gap-y-2 px-5 py-5 sm:px-8">
        <p className="w-full text-sm font-medium tracking-wide text-linesman">
          {meta.competition}
        </p>
        <h1 className="font-display text-3xl font-semibold leading-snug tracking-tight text-chalk sm:text-4xl lg:text-5xl">
          {meta.homeTeam}
          <span className="mx-3 inline-block min-w-[3.5ch] text-center tabular-nums text-caution sm:mx-4">
            {scoreHome}–{scoreAway}
          </span>
          {meta.awayTeam}
        </h1>
        <div className="ml-auto flex items-center gap-4 text-lg font-medium text-chalk sm:text-xl">
          {lastEvent && (
            <span className="tabular-nums text-linesman">{lastEvent.minute}&rsquo;</span>
          )}
          {live ? (
            <span className="flex items-center gap-2 text-caution">
              <span className="h-2.5 w-2.5 rounded-full bg-caution" aria-hidden="true" />
              Live
            </span>
          ) : (
            <span className="text-linesman">Full time</span>
          )}
        </div>
      </div>
    </section>
  );
}
