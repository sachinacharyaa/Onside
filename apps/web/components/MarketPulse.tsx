"use client";

import type { MatchEvent, MatchMeta } from "@onside/ingestion";

const W = 560;
const H = 230;
const PAD = { top: 20, right: 14, bottom: 26, left: 40 };

const implied = (odds: number) => 100 / odds;
const scaleX = (minute: number) => PAD.left + (minute / 95) * (W - PAD.left - PAD.right);
const scaleY = (prob: number) => PAD.top + (1 - prob / 100) * (H - PAD.top - PAD.bottom);

function path(points: { minute: number; prob: number }[]): string {
  return points
    .map((p, i) => `${i === 0 ? "M" : "L"}${scaleX(p.minute).toFixed(1)},${scaleY(p.prob).toFixed(1)}`)
    .join(" ");
}

/**
 * Supporting reference: implied win probability per side over match time.
 * Home = turf, away = whistle, draw = linesman dashed. Goals and red
 * cards are marked so price moves line up with what happened on the pitch.
 */
export function MarketPulse({ events, meta }: { events: MatchEvent[]; meta: MatchMeta }) {
  const withOdds = events.filter((e) => e.odds);
  const home = withOdds.map((e) => ({ minute: e.minute, prob: implied(e.odds!.home) }));
  const away = withOdds.map((e) => ({ minute: e.minute, prob: implied(e.odds!.away) }));
  const draw = withOdds
    .filter((e) => e.odds!.draw !== undefined)
    .map((e) => ({ minute: e.minute, prob: implied(e.odds!.draw!) }));
  const markers = events.filter(
    (e) => e.type === "goal" || (e.type === "card" && e.card === "red"),
  );

  return (
    <section
      aria-label="Market chart"
      className="rounded-md border border-hairline bg-chalk-2/50 p-4"
    >
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-lg font-semibold uppercase tracking-wide">
          Market pulse
        </h2>
        <p className="flex gap-3 text-xs text-linesman">
          <span className="text-turf">— {meta.homeTeam}</span>
          <span>–– draw</span>
          <span className="text-whistle">— {meta.awayTeam}</span>
        </p>
      </div>
      <p className="mb-2 text-xs text-linesman">
        Implied win probability from live odds, per event.
      </p>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        role="img"
        aria-label={`Implied win probability chart for ${meta.homeTeam} vs ${meta.awayTeam}`}
      >
        {[0, 25, 50, 75, 100].map((p) => (
          <g key={p}>
            <line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={scaleY(p)}
              y2={scaleY(p)}
              stroke="var(--color-hairline)"
              strokeWidth={1}
            />
            <text
              x={PAD.left - 6}
              y={scaleY(p) + 3}
              textAnchor="end"
              fontSize={10}
              fill="var(--color-linesman)"
            >
              {p}%
            </text>
          </g>
        ))}
        {[0, 15, 30, 45, 60, 75, 90].map((m) => (
          <text
            key={m}
            x={scaleX(m)}
            y={H - 8}
            textAnchor="middle"
            fontSize={10}
            fill="var(--color-linesman)"
          >
            {m}&rsquo;
          </text>
        ))}

        {markers.map((e, i) => (
          <g key={i}>
            <line
              x1={scaleX(e.minute)}
              x2={scaleX(e.minute)}
              y1={PAD.top - 2}
              y2={H - PAD.bottom}
              stroke={e.type === "goal" ? "var(--color-caution)" : "var(--color-whistle)"}
              strokeWidth={1.2}
              strokeDasharray="3 3"
            />
            <rect
              x={scaleX(e.minute) - 3}
              y={PAD.top - 12}
              width={6}
              height={9}
              rx={1}
              fill={e.type === "goal" ? "var(--color-caution)" : "var(--color-whistle)"}
              transform={`rotate(6 ${scaleX(e.minute)} ${PAD.top - 8})`}
            />
          </g>
        ))}

        {draw.length > 1 && (
          <path
            d={path(draw)}
            fill="none"
            stroke="var(--color-linesman)"
            strokeWidth={1.5}
            strokeDasharray="4 4"
          />
        )}
        {away.length > 1 && (
          <path d={path(away)} fill="none" stroke="var(--color-whistle)" strokeWidth={2} />
        )}
        {home.length > 1 && (
          <path d={path(home)} fill="none" stroke="var(--color-turf)" strokeWidth={2.5} />
        )}
      </svg>
    </section>
  );
}
