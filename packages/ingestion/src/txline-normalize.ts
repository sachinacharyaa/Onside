import type { MatchEvent } from "./types.js";

/**
 * Normalizes raw TxLINE (txodds) payloads into the shared MatchEvent shape.
 *
 * Scores records follow the TxLINE `Scores` schema (action, gameState,
 * scoreSoccer, seq, ts, participant1IsHome). Odds records follow
 * `OddsPayload` (SuperOddsType, PriceNames, Prices, Pct).
 *
 * Docs: https://txline.txodds.com/documentation/scores/soccer-feed
 */

type RawRecord = Record<string, any>;

/** Soccer game phases that mean the match has ended (F, FET, FPE). */
const FINAL_PHASES = new Set(["F", "FET", "FPE"]);
const LIVE_PHASES = new Set(["H1", "H2", "ET1", "ET2", "PE"]);

function get(raw: RawRecord, ...paths: string[][]): any {
  for (const path of paths) {
    let cur: any = raw;
    for (const key of path) {
      if (cur === null || typeof cur !== "object") {
        cur = undefined;
        break;
      }
      cur = cur[key] ?? cur[key.charAt(0).toUpperCase() + key.slice(1)];
    }
    if (cur !== undefined) return cur;
  }
  return undefined;
}

export class TxlineNormalizer {
  private readonly matchId: string;
  private readonly fixtureId: number;
  private participant1IsHome = true;
  private startTimeMs: number | null = null;
  private score = { home: 0, away: 0 };
  private cards = { homeYellow: 0, awayYellow: 0, homeRed: 0, awayRed: 0 };
  private kickedOff = false;
  private finished = false;
  private lastOddsEmitMs = 0;
  private lastOdds: { home: number; draw?: number; away: number } | null = null;

  constructor(fixtureId: number) {
    this.fixtureId = fixtureId;
    this.matchId = `txline-${fixtureId}`;
  }

  get isFinished(): boolean {
    return this.finished;
  }

  private minuteOf(raw: RawRecord): number {
    const minutes = get(
      raw,
      ["dataSoccer", "reference", "minutes"],
      ["dataSoccer", "clock", "minutes"],
      ["clock", "minutes"],
      ["minutes"],
    );
    if (typeof minutes === "number" && minutes >= 0) return minutes;
    // Fallback: elapsed wall-clock from kickoff.
    const ts = typeof raw.ts === "number" ? raw.ts : Date.now();
    if (this.startTimeMs && ts > this.startTimeMs) {
      return Math.min(120, Math.floor((ts - this.startTimeMs) / 60_000));
    }
    return 0;
  }

  private sideOf(raw: RawRecord): "home" | "away" | undefined {
    const participant = get(raw, ["participant"]);
    if (participant !== 1 && participant !== 2) return undefined;
    const isP1 = participant === 1;
    return isP1 === this.participant1IsHome ? "home" : "away";
  }

  private readScores(raw: RawRecord): { home: number; away: number } | null {
    const p1 = get(raw, ["scoreSoccer", "participant1", "total", "goals"]);
    const p2 = get(raw, ["scoreSoccer", "participant2", "total", "goals"]);
    if (typeof p1 !== "number" || typeof p2 !== "number") return null;
    return this.participant1IsHome ? { home: p1, away: p2 } : { home: p2, away: p1 };
  }

  private base(raw: RawRecord, minute: number): Omit<MatchEvent, "type"> {
    return {
      matchId: this.matchId,
      minute,
      scoreHome: this.score.home,
      scoreAway: this.score.away,
      odds: this.lastOdds ?? undefined,
      timestamp: new Date(typeof raw.ts === "number" ? raw.ts : Date.now()).toISOString(),
    };
  }

  /**
   * Normalize one TxLINE scores record. Returns zero or more MatchEvents
   * (a single record can both change the score and end the match).
   */
  scoreRecordToEvents(raw: RawRecord): MatchEvent[] {
    if (typeof raw !== "object" || raw === null) return [];
    if (typeof raw.fixtureId === "number" && raw.fixtureId !== this.fixtureId) return [];
    if (this.finished) return [];

    const p1Home = get(raw, ["participant1IsHome"]);
    if (typeof p1Home === "boolean") this.participant1IsHome = p1Home;
    const startTime = get(raw, ["startTime"]);
    if (typeof startTime === "number") this.startTimeMs = startTime;

    const events: MatchEvent[] = [];
    const action = String(raw.action ?? "").toLowerCase();
    const gameState = String(raw.gameState ?? "");
    const minute = this.minuteOf(raw);

    const newScore = this.readScores(raw);

    // Kickoff: first time we see a live phase.
    if (!this.kickedOff && (LIVE_PHASES.has(gameState) || action === "kick_off")) {
      this.kickedOff = true;
      events.push({ ...this.base(raw, 0), type: "kickoff" });
    }

    // Goal: score changed (covers goal / own_goal / penalty / VAR-confirmed).
    if (newScore && (newScore.home !== this.score.home || newScore.away !== this.score.away)) {
      const team = newScore.home !== this.score.home ? "home" : "away";
      this.score = newScore;
      events.push({
        ...this.base(raw, minute),
        type: "goal",
        team,
        player: get(raw, ["dataSoccer", "reference", "player"], ["player"]),
      });
    } else if (newScore) {
      this.score = newScore;
    }

    // Cards: read cumulative card counts from the score payload.
    const p1 = this.participant1IsHome ? "participant1" : "participant2";
    const p2 = this.participant1IsHome ? "participant2" : "participant1";
    const cardCounts = {
      homeYellow: get(raw, ["scoreSoccer", p1, "total", "yellowCards"]),
      awayYellow: get(raw, ["scoreSoccer", p2, "total", "yellowCards"]),
      homeRed: get(raw, ["scoreSoccer", p1, "total", "redCards"]),
      awayRed: get(raw, ["scoreSoccer", p2, "total", "redCards"]),
    };
    for (const [key, colour, team] of [
      ["homeYellow", "yellow", "home"],
      ["awayYellow", "yellow", "away"],
      ["homeRed", "red", "home"],
      ["awayRed", "red", "away"],
    ] as const) {
      const count = cardCounts[key];
      if (typeof count === "number" && count > this.cards[key]) {
        this.cards[key] = count;
        events.push({ ...this.base(raw, minute), type: "card", team, card: colour });
      }
    }

    // Substitution action.
    if (action === "substitution") {
      events.push({ ...this.base(raw, minute), type: "substitution", team: this.sideOf(raw) });
    }

    // Full time: game_finalised action or a final phase.
    if (action === "game_finalised" || FINAL_PHASES.has(gameState)) {
      this.finished = true;
      events.push({ ...this.base(raw, Math.max(minute, 90)), type: "fulltime" });
    }

    return events;
  }

  /**
   * Normalize one TxLINE OddsPayload into an odds_tick (or null when the
   * record is not a full-match 1X2 line, or throttled).
   */
  oddsRecordToEvent(raw: RawRecord, throttleMs = 5000): MatchEvent | null {
    if (typeof raw !== "object" || raw === null) return null;
    const fixtureId = raw.FixtureId ?? raw.fixtureId;
    if (typeof fixtureId === "number" && fixtureId !== this.fixtureId) return null;
    if (this.finished) return null;

    // Only full-match three-way (1X2 / match result) lines.
    const marketPeriod = String(raw.MarketPeriod ?? "").toLowerCase();
    if (marketPeriod && !/full|match|total|^$|game/.test(marketPeriod)) return null;
    const names: string[] = Array.isArray(raw.PriceNames) ? raw.PriceNames.map(String) : [];
    if (names.length !== 3) return null;

    const odds = this.extractThreeWayOdds(raw, names);
    if (!odds) return null;

    this.lastOdds = odds;

    const now = typeof raw.Ts === "number" ? raw.Ts : Date.now();
    if (now - this.lastOddsEmitMs < throttleMs) return null;
    this.lastOddsEmitMs = now;

    return { ...this.base(raw, this.minuteOf(raw)), type: "odds_tick", odds };
  }

  private extractThreeWayOdds(
    raw: RawRecord,
    names: string[],
  ): { home: number; draw: number; away: number } | null {
    const lower = names.map((n) => n.toLowerCase());
    const idx = (candidates: string[]) => lower.findIndex((n) => candidates.includes(n));
    let iHome = idx(["1", "home", "p1"]);
    let iDraw = idx(["x", "draw"]);
    let iAway = idx(["2", "away", "p2"]);
    if (iHome === -1 || iDraw === -1 || iAway === -1) {
      // Assume conventional [1, X, 2] ordering when names are unrecognised.
      [iHome, iDraw, iAway] = [0, 1, 2];
    }
    if (!this.participant1IsHome) [iHome, iAway] = [iAway, iHome];

    // Prefer de-margined Pct (implied %) → decimal odds; fall back to
    // Prices, which are fixed-point decimal odds (×1000).
    const pct: unknown[] = Array.isArray(raw.Pct) ? raw.Pct : [];
    const prices: unknown[] = Array.isArray(raw.Prices) ? raw.Prices : [];
    const oddsAt = (i: number): number | null => {
      const p = Number(pct[i]);
      if (Number.isFinite(p) && p > 0) return Math.round((100 / p) * 100) / 100;
      const price = Number(prices[i]);
      if (Number.isFinite(price) && price > 0) {
        const decimal = price > 100 ? price / 1000 : price;
        return Math.round(decimal * 100) / 100;
      }
      return null;
    };

    const home = oddsAt(iHome);
    const draw = oddsAt(iDraw);
    const away = oddsAt(iAway);
    if (home === null || draw === null || away === null) return null;
    return { home, draw, away };
  }
}
