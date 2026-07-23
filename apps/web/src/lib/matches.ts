export type FeaturedMatch = {
  id: string;
  fixtureId: number;
  home: string;
  away: string;
  competition: string;
  /** ISO kickoff; rendered as e.g. "18 Jul 2026". */
  kickoffIso: string;
  /** Final score from TxLINE game_finalised. */
  finalScore: string;
  blurb: string;
  tag: string;
  accent: "turf" | "whistle" | "caution";
  homeLean: number;
  awayLean: number;
  poster: string;
  posterCredit: string;
  /** Spotlight the World Cup Final (glow / pulse on landing list). */
  highlight?: boolean;
};

/** Upcoming fixture — real metadata only, never mixed into the replay grid. */
export type UpcomingFixture = {
  fixtureId: number;
  home: string;
  away: string;
  competition: string;
  kickoffIso: string;
  /** Real StablePrice 1X2 when TxLINE exposes it; omit if unavailable. */
  odds?: { home: number; draw: number; away: number };
  poster: string;
};

function formatCardDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export { formatCardDate };

/**
 * Finished fixtures for the landing grid, most recent first.
 * World Cup Final leads; three knockout replays follow.
 */
export const FEATURED: FeaturedMatch[] = [
  {
    id: "txline-18257739",
    fixtureId: 18257739,
    home: "Spain",
    away: "Argentina",
    competition: "World Cup 2026, Final",
    kickoffIso: "2026-07-19T19:00:00.000Z",
    finalScore: "1-0",
    blurb:
      "Ferran Torres at 106' — Spain world champions after extra time. Ten-man Argentina, full decision log through full-time.",
    tag: "World Cup Final",
    accent: "caution",
    homeLean: 56,
    awayLean: 44,
    poster: "/brand/matches/esp-arg.jpg",
    posterCredit: "Stadium night · Commons",
    highlight: true,
  },
  {
    id: "txline-18257865",
    fixtureId: 18257865,
    home: "France",
    away: "England",
    competition: "World Cup 2026, 3rd Place Final",
    kickoffIso: "2026-07-18T21:00:00.000Z",
    finalScore: "4-6",
    blurb:
      "Real TxLINE historical feed — ten goals, odds swings, Merkle-backed settlement on seq 1195.",
    tag: "Recorded replay",
    accent: "caution",
    homeLean: 40,
    awayLean: 60,
    poster: "/brand/matches/fra-eng-3rd.jpg",
    posterCredit: "Wembley · England vs France (Commons)",
  },
  {
    id: "txline-18241006",
    fixtureId: 18241006,
    home: "England",
    away: "Argentina",
    competition: "World Cup 2026, Semi-final",
    kickoffIso: "2026-07-15T19:00:00.000Z",
    finalScore: "1-2",
    blurb:
      "Semi-final recorded from TxLINE — five goals, live odds path, settled on the real final seq.",
    tag: "Recorded replay",
    accent: "turf",
    homeLean: 47,
    awayLean: 53,
    poster: "/brand/matches/esp-arg.jpg",
    posterCredit: "Stadium night · Commons",
  },
  {
    id: "txline-18237038",
    fixtureId: 18237038,
    home: "France",
    away: "Spain",
    competition: "World Cup 2026, Semi-final",
    kickoffIso: "2026-07-14T19:00:00.000Z",
    finalScore: "0-2",
    blurb:
      "Semi-final recorded from TxLINE — Spain through, full decision log through on-chain proof.",
    tag: "Recorded replay",
    accent: "whistle",
    homeLean: 45,
    awayLean: 55,
    poster: "/brand/matches/bra-fra.jpg",
    posterCredit: "Stade de France night match (Commons)",
  },
];
