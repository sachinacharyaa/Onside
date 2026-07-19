import { Link } from "react-router-dom";
import type { FeaturedMatch } from "@/lib/matches";
import { MatchCrest } from "./LandingIcons";

const ACCENT_TEXT: Record<FeaturedMatch["accent"], string> = {
  turf: "text-turf",
  caution: "text-caution",
  whistle: "text-whistle",
};

/** Large featured match card — typographic crest only (no stock photography). */
export function MatchPoster({ match }: { match: FeaturedMatch }) {
  return (
    <article className="relative overflow-hidden rounded-2xl border border-hairline bg-gradient-to-br from-turf/15 via-panel to-chalk-2 shadow-[0_16px_48px_rgba(24,38,32,0.1)]">
      <div className="relative grid gap-6 p-6 sm:p-8 lg:grid-cols-[1.2fr_1fr] lg:items-stretch">
        <div className="flex flex-col">
          <div className="flex flex-wrap items-center gap-3">
            <span
              className={`rounded-full border border-current/30 bg-panel px-3 py-1 text-sm font-medium ${ACCENT_TEXT[match.accent]}`}
            >
              {match.tag}
            </span>
            <span className="text-sm font-medium tracking-wide text-linesman">
              {match.competition}
            </span>
          </div>

          <div className="mt-5 flex items-start gap-5">
            <MatchCrest
              home={match.home}
              away={match.away}
              accent={match.accent}
              className="h-20 w-20 shrink-0"
            />
            <h2 className="font-display text-4xl font-semibold leading-snug tracking-tight sm:text-5xl">
              <span className="text-ink">{match.home}</span>
              <span className="mx-3 text-linesman">vs</span>
              <span className="block text-ink sm:inline">{match.away}</span>
            </h2>
          </div>

          <p className="mt-4 max-w-md text-sm leading-relaxed text-linesman sm:text-base">
            {match.blurb}
          </p>

          <div className="mt-auto flex flex-wrap gap-3 pt-8">
            <Link
              to={`/live?match=${match.id}`}
              className="inline-flex min-h-12 items-center rounded-full bg-turf px-6 py-3 text-sm font-semibold text-chalk transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-turf"
            >
              Watch agent →
            </Link>
            <Link
              to="/rulebook"
              className="inline-flex min-h-12 items-center rounded-full border border-hairline bg-panel px-6 py-3 text-sm font-semibold text-ink transition-colors hover:border-turf/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-turf"
            >
              View rulebook
            </Link>
          </div>
        </div>

        <div className="flex flex-col justify-between rounded-xl border border-hairline bg-panel p-5">
          <div>
            <p className="text-sm font-medium tracking-wide text-linesman">
              Implied lean at kickoff
            </p>
            <div className="mt-4 space-y-4">
              <LeanBar label={match.home} pct={match.homeLean} color="bg-turf" />
              <LeanBar label={match.away} pct={match.awayLean} color="bg-whistle" />
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <Stat label="Mode" value="Replay" />
            <Stat label="Settle" value="On-chain" />
            <Stat label="Rules" value="3 named" />
            <Stat label="AI / ML" value="None" />
          </div>
        </div>
      </div>
    </article>
  );
}

function LeanBar({ label, pct, color }: { label: string; pct: number; color: string }) {
  return (
    <div>
      <div className="mb-1.5 flex justify-between text-sm font-medium tracking-wide">
        <span>{label}</span>
        <span className="text-linesman">{pct}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-hairline">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-hairline bg-chalk px-3 py-2">
      <p className="text-xs font-medium tracking-wide text-linesman">{label}</p>
      <p className="font-display text-sm font-semibold tracking-tight text-ink">{value}</p>
    </div>
  );
}

/** Compact card for the match grid. */
export function MatchCard({ match }: { match: FeaturedMatch }) {
  return (
    <Link
      to={`/live?match=${match.id}`}
      className="group flex flex-col rounded-2xl border border-hairline bg-panel p-5 transition-colors hover:border-turf/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-turf"
    >
      <MatchCrest
        home={match.home}
        away={match.away}
        accent={match.accent}
        className="mb-3 h-16 w-16 self-center"
      />
      <span className={`text-center text-sm font-medium tracking-wide ${ACCENT_TEXT[match.accent]}`}>
        {match.tag}
      </span>
      <h3 className="mt-2 text-center font-display text-2xl font-semibold leading-snug tracking-tight">
        {match.home}
        <span className="mx-2 text-linesman">vs</span>
        {match.away}
      </h3>
      <p className="mt-2 line-clamp-2 text-center text-sm leading-relaxed text-linesman">
        {match.blurb}
      </p>
      <span className="mt-4 text-center text-sm font-semibold text-turf group-hover:underline">
        Open live stage →
      </span>
    </Link>
  );
}
