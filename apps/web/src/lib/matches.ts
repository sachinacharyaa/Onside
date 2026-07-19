export type FeaturedMatch = {
  id: string;
  home: string;
  away: string;
  competition: string;
  blurb: string;
  tag: string;
  /** Tailwind-ish gradient stops for the poster */
  accent: "turf" | "whistle" | "caution";
  homeLean: number;
  awayLean: number;
};

export const FEATURED: FeaturedMatch[] = [
  {
    id: "esp-arg",
    home: "Spain",
    away: "Argentina",
    competition: "World Cup 2026 · Semi-final",
    blurb: "Away win script — red card swing, late Álvarez finish. Watch the agent stamp every call.",
    tag: "FEATURED REPLAY",
    accent: "turf",
    homeLean: 38,
    awayLean: 62,
  },
  {
    id: "bra-fra",
    home: "Brazil",
    away: "France",
    competition: "World Cup 2026 · Quarter-final",
    blurb: "Lead changes, Mbappé equaliser, Endrick winner. The classic demo path to on-chain settlement.",
    tag: "DEMO FAVOURITE",
    accent: "caution",
    homeLean: 54,
    awayLean: 46,
  },
  {
    id: "fra-eng",
    home: "France",
    away: "England",
    competition: "World Cup 2026 · Group stage",
    blurb: "Ends level — agent settles DRAW. Perfect for showing settle paths that aren't just home wins.",
    tag: "DRAW PATH",
    accent: "whistle",
    homeLean: 48,
    awayLean: 52,
  },
];
