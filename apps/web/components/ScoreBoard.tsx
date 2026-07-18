"use client";

import type { MatchEvent, MatchMeta } from "@onside/ingestion";

export function ScoreBoard({
  meta,
  lastEvent,
  live,
}: {
  meta: MatchMeta;
  lastEvent: MatchEvent | null;
  live: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
      <div>
        <p className="text-xs uppercase tracking-widest text-chalk-dim">{meta.competition}</p>
        <p className="text-2xl font-bold tracking-tight">
          {meta.homeTeam}
          <span className="mx-3 rounded bg-pitch-700 px-3 py-1 font-mono text-xl tabular-nums">
            {lastEvent ? `${lastEvent.scoreHome} – ${lastEvent.scoreAway}` : "0 – 0"}
          </span>
          {meta.awayTeam}
        </p>
      </div>
      <div className="ml-auto flex items-center gap-3 font-mono text-sm">
        {lastEvent && (
          <span className="rounded border border-line bg-pitch-800 px-2.5 py-1 tabular-nums">
            {lastEvent.minute}&rsquo;
          </span>
        )}
        <span
          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${
            live
              ? "border-red-500/50 bg-red-500/10 text-red-300"
              : "border-slate-500/40 bg-slate-500/10 text-slate-300"
          }`}
        >
          <span className={`h-2 w-2 rounded-full ${live ? "pulse-dot bg-red-400" : "bg-slate-500"}`} />
          {live ? "LIVE" : "ENDED"}
        </span>
      </div>
    </div>
  );
}
