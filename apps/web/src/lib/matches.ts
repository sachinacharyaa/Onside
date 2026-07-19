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
 * Three real finished TxLINE fixtures, most recent first.
 * Note: only 18257865 (18 Jul) falls inside a strict 3-day window from
 * 19 Jul 2026; 15 Jul + 14 Jul semis are the next most recent finalised WC
 * matches still inside TxLINE historical retention.
 */
export const FEATURED: FeaturedMatch[] = [
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

/** Next covered fixture — Spain vs Argentina Final (not a replay). */
export const NEXT_FIXTURE: UpcomingFixture = {
  fixtureId: 18257739,
  home: "Spain",
  away: "Argentina",
  competition: "World Cup 2026, Final",
  kickoffIso: "2026-07-19T19:00:00.000Z",
  // Real StablePrice demargined 1X2 from /api/odds/snapshot/18257739 (full match).
  odds: { home: 2.38, draw: 3.18, away: 3.76 },
  poster: "/brand/matches/esp-arg.jpg",
};
