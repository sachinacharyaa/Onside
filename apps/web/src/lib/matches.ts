export type FeaturedMatch = {
  id: string;
  home: string;
  away: string;
  competition: string;
  blurb: string;
  tag: string;
  /** Accent for typographic crest / tags (team-safe, no stock imagery). */
  accent: "turf" | "whistle" | "caution";
  homeLean: number;
  awayLean: number;
};

export const FEATURED: FeaturedMatch[] = [
  {
    id: "fra-eng-3rd",
    home: "France",
    away: "England",
    competition: "World Cup 2026, 3rd Place Final",
    blurb:
      "Real TxLINE historical feed — ten goals, odds swings, then Merkle-backed settlement on the real final seq.",
    tag: "Primary demo",
    accent: "caution",
    homeLean: 40,
    awayLean: 60,
  },
  {
    id: "esp-arg",
    home: "Spain",
    away: "Argentina",
    competition: "World Cup 2026, Semi-final",
    blurb:
      "Away win script: red card swing, late Álvarez finish. Watch the agent stamp every call.",
    tag: "Featured replay",
    accent: "turf",
    homeLean: 38,
    awayLean: 62,
  },
  {
    id: "bra-fra",
    home: "Brazil",
    away: "France",
    competition: "World Cup 2026, Quarter-final",
    blurb:
      "Hand-built lead changes for rehearsal. Same pipeline — without on-chain TxLINE validation.",
    tag: "Dev fixture",
    accent: "whistle",
    homeLean: 54,
    awayLean: 46,
  },
];
