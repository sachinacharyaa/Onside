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
  /** Optional full-bleed promotional art under the card */
  poster?: string;
};

export const FEATURED: FeaturedMatch[] = [
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
    poster: "/brand/esp-arg-poster.png",
  },
  {
    id: "bra-fra",
    home: "Brazil",
    away: "France",
    competition: "World Cup 2026, Quarter-final",
    blurb:
      "Lead changes, Mbappé equaliser, Endrick winner. The classic demo path to on-chain settlement.",
    tag: "Demo favourite",
    accent: "caution",
    homeLean: 54,
    awayLean: 46,
  },
  {
    id: "fra-eng",
    home: "France",
    away: "England",
    competition: "World Cup 2026, Group stage",
    blurb:
      "Ends level. Agent settles DRAW. Perfect for showing settle paths that aren't just home wins.",
    tag: "Draw path",
    accent: "whistle",
    homeLean: 48,
    awayLean: 52,
  },
];
