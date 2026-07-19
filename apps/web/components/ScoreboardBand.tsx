"use client";

import type { MatchEvent, MatchMeta } from "@onside/ingestion";

/**
 * Full-bleed broadcast scoreboard: ink band, chalk digits, condensed
 * display type. The one dark element on the page — it anchors the layout.
 */
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
    <section aria-label="Scoreboard" className="bg-ink text-chalk">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-8 gap-y-2 px-5 py-4 sm:px-8">
        <p className="w-full font-display text-sm font-medium uppercase tracking-[0.2em] text-chalk/60">
          {meta.competition}
        </p>
        <h1 className="font-display text-4xl font-bold uppercase leading-none tracking-tight sm:text-5xl">
          {meta.homeTeam}
          <span className="mx-4 inline-block min-w-[3.5ch] text-center tabular-nums text-caution">
            {scoreHome}–{scoreAway}
          </span>
          {meta.awayTeam}
        </h1>
        <div className="ml-auto flex items-center gap-4 font-display text-xl font-semibold">
          {lastEvent && <span className="tabular-nums">{lastEvent.minute}&rsquo;</span>}
          {live ? (
            <span className="flex items-center gap-2 uppercase tracking-widest">
              <span className="h-2.5 w-2.5 rounded-full bg-whistle" aria-hidden="true" />
              Live
            </span>
          ) : (
            <span className="uppercase tracking-widest text-chalk/70">Full time</span>
          )}
        </div>
      </div>
    </section>
  );
}
