"use client";

import type { MatchEvent, MatchMeta } from "@onside/ingestion";

const W = 560;
const H = 240;
const PAD = { top: 16, right: 14, bottom: 26, left: 40 };

const implied = (odds: number) => 100 / odds;

function scaleX(minute: number): number {
  return PAD.left + (minute / 95) * (W - PAD.left - PAD.right);
}

function scaleY(prob: number): number {
  return PAD.top + (1 - prob / 100) * (H - PAD.top - PAD.bottom);
}

function path(points: { minute: number; prob: number }[]): string {
  return points
    .map((p, i) => `${i === 0 ? "M" : "L"}${scaleX(p.minute).toFixed(1)},${scaleY(p.prob).toFixed(1)}`)
    .join(" ");
}

/**
 * Implied win-probability chart (from decimal odds), updating per event.
 * Goals/red cards are marked so odds moves visibly line up with events.
 */
export function OddsChart({ events, meta }: { events: MatchEvent[]; meta: MatchMeta }) {
  const withOdds = events.filter((e) => e.odds);
  const home = withOdds.map((e) => ({ minute: e.minute, prob: implied(e.odds!.home) }));
  const away = withOdds.map((e) => ({ minute: e.minute, prob: implied(e.odds!.away) }));
  const draw = withOdds
    .filter((e) => e.odds!.draw !== undefined)
    .map((e) => ({ minute: e.minute, prob: implied(e.odds!.draw!) }));
  const markers = events.filter((e) => e.type === "goal" || (e.type === "card" && e.card === "red"));

  return (
    <div className="rounded-xl border border-line bg-pitch-900/70 p-4">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-chalk-dim">
          Implied win probability
        </h2>
        <div className="flex gap-4 font-mono text-xs">
          <span className="text-home">— {meta.homeTeam}</span>
          <span className="text-draw">— draw</span>
          <span className="text-away">— {meta.awayTeam}</span>
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Odds movement chart">
        {[0, 25, 50, 75, 100].map((p) => (
          <g key={p}>
            <line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={scaleY(p)}
              y2={scaleY(p)}
              stroke="#23402e"
              strokeWidth={1}
              strokeDasharray={p === 50 ? "0" : "3 4"}
            />
            <text x={PAD.left - 6} y={scaleY(p) + 3} textAnchor="end" fontSize={10} fill="#8fb39c">
              {p}%
            </text>
          </g>
        ))}
        {[0, 15, 30, 45, 60, 75, 90].map((m) => (
          <text key={m} x={scaleX(m)} y={H - 8} textAnchor="middle" fontSize={10} fill="#8fb39c">
            {m}&rsquo;
          </text>
        ))}

        {draw.length > 1 && <path d={path(draw)} fill="none" stroke="#94a3b8" strokeWidth={1.5} opacity={0.7} />}
        {away.length > 1 && <path d={path(away)} fill="none" stroke="#60a5fa" strokeWidth={2} />}
        {home.length > 1 && <path d={path(home)} fill="none" stroke="#4ade80" strokeWidth={2.5} />}

        {markers.map((e, i) => (
          <g key={i}>
            <line
              x1={scaleX(e.minute)}
              x2={scaleX(e.minute)}
              y1={PAD.top}
              y2={H - PAD.bottom}
              stroke={e.type === "goal" ? "#4ade80" : "#f87171"}
              strokeWidth={1}
              strokeDasharray="2 3"
              opacity={0.6}
            />
            <text
              x={scaleX(e.minute)}
              y={PAD.top - 3}
              textAnchor="middle"
              fontSize={11}
              fill={e.type === "goal" ? "#4ade80" : "#f87171"}
            >
              {e.type === "goal" ? "⚽" : "🟥"}
            </text>
          </g>
        ))}

        {home.length > 0 && (
          <circle
            cx={scaleX(home[home.length - 1].minute)}
            cy={scaleY(home[home.length - 1].prob)}
            r={4}
            fill="#4ade80"
            className="pulse-dot"
          />
        )}
      </svg>
    </div>
  );
}
