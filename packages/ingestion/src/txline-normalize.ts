import type { MatchEvent } from "./types.js";

/**
 * Normalizes raw TxLINE (txodds) payloads into the shared MatchEvent shape.
 *
 * Handles both camelCase docs examples and the PascalCase wire format
 * actually returned by txline-dev (Score.Participant1.Total.Goals, StatusId, …).
 *
 * Docs: https://txline.txodds.com/documentation/scores/soccer-feed
 */

type RawRecord = Record<string, any>;

const LIVE_PHASE_LETTERS = new Set(["H1", "H2", "ET1", "ET2", "PE"]);
const LIVE_STATUS_IDS = new Set([2, 4, 7, 9, 12]); // H1, H2, ET1, ET2, PE

function pick(raw: RawRecord, ...keys: string[]): any {
  for (const key of keys) {
    if (raw[key] !== undefined && raw[key] !== null) return raw[key];
  }
  return undefined;
}

function fixtureIdOf(raw: RawRecord): number | undefined {
  const id = pick(raw, "FixtureId", "fixtureId");
  return typeof id === "number" ? id : undefined;
}

function actionOf(raw: RawRecord): string {
  return String(pick(raw, "Action", "action") ?? "").toLowerCase();
}

function gameStateLetter(raw: RawRecord): string {
  const gs = pick(raw, "GameState", "gameState");
  return typeof gs === "string" ? gs : "";
}

function statusIdOf(raw: RawRecord): number | undefined {
  const id = pick(raw, "StatusId", "statusId");
  return typeof id === "number" ? id : undefined;
}

function nested(raw: RawRecord, ...path: string[]): any {
  let cur: any = raw;
  for (const key of path) {
    if (cur === null || typeof cur !== "object") return undefined;
    cur =
      cur[key] ??
      cur[key.charAt(0).toUpperCase() + key.slice(1)] ??
      cur[key.charAt(0).toLowerCase() + key.slice(1)];
  }
  return cur;
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
  /** Last seen Seq/seq for settlement / validation (Step C). */
  lastScoreSeq: number | null = null;
  lastScoreRecord: RawRecord | null = null;

  constructor(fixtureId: number) {
    this.fixtureId = fixtureId;
    this.matchId = `txline-${fixtureId}`;
  }

  get isFinished(): boolean {
    return this.finished;
  }

  private minuteOf(raw: RawRecord): number {
    const clockSeconds = nested(raw, "Clock", "Seconds") ?? nested(raw, "clock", "seconds");
    if (typeof clockSeconds === "number" && clockSeconds >= 0) {
      return Math.min(120, Math.floor(clockSeconds / 60));
    }
    const minutes =
      nested(raw, "dataSoccer", "reference", "minutes") ??
      nested(raw, "Data", "Reference", "Minutes") ??
      nested(raw, "clock", "minutes") ??
      nested(raw, "Clock", "Minutes") ??
      pick(raw, "minutes", "Minutes");
    if (typeof minutes === "number" && minutes >= 0) return minutes;

    const tsRaw = pick(raw, "Ts", "ts");
    const ts = typeof tsRaw === "number" ? tsRaw : Date.now();
    if (this.startTimeMs && ts > this.startTimeMs) {
      return Math.min(120, Math.floor((ts - this.startTimeMs) / 60_000));
    }
    return 0;
  }

  private sideOf(raw: RawRecord): "home" | "away" | undefined {
    const participant = pick(raw, "Participant", "participant");
    if (participant !== 1 && participant !== 2) return undefined;
    const isP1 = participant === 1;
    return isP1 === this.participant1IsHome ? "home" : "away";
  }

  private readScores(raw: RawRecord): { home: number; away: number } | null {
    let p1 =
      nested(raw, "Score", "Participant1", "Total", "Goals") ??
      nested(raw, "scoreSoccer", "participant1", "total", "goals") ??
      nested(raw, "ScoreSoccer", "Participant1", "Total", "Goals");
    let p2 =
      nested(raw, "Score", "Participant2", "Total", "Goals") ??
      nested(raw, "scoreSoccer", "participant2", "total", "goals") ??
      nested(raw, "ScoreSoccer", "Participant2", "Total", "Goals");

    if (typeof p1 !== "number" || typeof p2 !== "number") {
      const stats = pick(raw, "Stats", "stats");
      if (stats && typeof stats === "object") {
        const s1 = Number(stats["1"] ?? stats[1]);
        const s2 = Number(stats["2"] ?? stats[2]);
        if (Number.isFinite(s1) && Number.isFinite(s2)) {
          p1 = s1;
          p2 = s2;
        }
      }
    }

    if (typeof p1 !== "number" || typeof p2 !== "number") return null;
    return this.participant1IsHome ? { home: p1, away: p2 } : { home: p2, away: p1 };
  }

  private readCardFromScore(
    raw: RawRecord,
    side: "home" | "away",
    colour: "yellow" | "red",
  ): number | undefined {
    const pKey =
      side === "home"
        ? this.participant1IsHome
          ? "Participant1"
          : "Participant2"
        : this.participant1IsHome
          ? "Participant2"
          : "Participant1";
    const field = colour === "yellow" ? "YellowCards" : "RedCards";
    const camel = colour === "yellow" ? "yellowCards" : "redCards";
    const v =
      nested(raw, "Score", pKey, "Total", field) ??
      nested(raw, "scoreSoccer", pKey.charAt(0).toLowerCase() + pKey.slice(1), "total", camel) ??
      nested(raw, "ScoreSoccer", pKey, "Total", field);
    return typeof v === "number" ? v : undefined;
  }

  private base(raw: RawRecord, minute: number): Omit<MatchEvent, "type"> {
    const ts = pick(raw, "Ts", "ts");
    const seq = pick(raw, "Seq", "seq");
    return {
      matchId: this.matchId,
      minute,
      scoreHome: this.score.home,
      scoreAway: this.score.away,
      odds: this.lastOdds ?? undefined,
      timestamp: new Date(typeof ts === "number" ? ts : Date.now()).toISOString(),
      ...(typeof seq === "number" && seq >= 1 ? { seq } : {}),
    };
  }

  private isLivePhase(raw: RawRecord): boolean {
    const letter = gameStateLetter(raw);
    const status = statusIdOf(raw);
    return LIVE_PHASE_LETTERS.has(letter) || (status !== undefined && LIVE_STATUS_IDS.has(status));
  }

  private isFinalPhase(raw: RawRecord): boolean {
    const status = statusIdOf(raw);
    const action = actionOf(raw);
    // TxLINE posts game_finalised (StatusId 100) after the classic F frame.
    // Prefer that so preferredSeq matches validateStat / Step C smoke.
    return action === "game_finalised" || status === 100;
  }

  /**
   * Normalize one TxLINE scores record. Returns zero or more MatchEvents
   * (a single record can both change the score and end the match).
   */
  scoreRecordToEvents(raw: RawRecord): MatchEvent[] {
    if (typeof raw !== "object" || raw === null) return [];
    const fid = fixtureIdOf(raw);
    if (fid !== undefined && fid !== this.fixtureId) return [];
    if (this.finished) return [];

    const p1Home = pick(raw, "Participant1IsHome", "participant1IsHome");
    if (typeof p1Home === "boolean") this.participant1IsHome = p1Home;
    const startTime = pick(raw, "StartTime", "startTime");
    if (typeof startTime === "number") this.startTimeMs = startTime;

    const seq = pick(raw, "Seq", "seq");
    if (typeof seq === "number") this.lastScoreSeq = seq;
    this.lastScoreRecord = raw;

    const events: MatchEvent[] = [];
    const action = actionOf(raw);
    const minute = this.minuteOf(raw);
    const newScore = this.readScores(raw);

    if (
      !this.kickedOff &&
      (this.isLivePhase(raw) ||
        action === "kick_off" ||
        (newScore !== null && (newScore.home > 0 || newScore.away > 0)))
    ) {
      this.kickedOff = true;
      events.push({ ...this.base(raw, 0), type: "kickoff" });
    }

    if (newScore && (newScore.home !== this.score.home || newScore.away !== this.score.away)) {
      const team =
        newScore.home !== this.score.home
          ? "home"
          : newScore.away !== this.score.away
            ? "away"
            : undefined;
      this.score = newScore;
      events.push({
        ...this.base(raw, minute),
        type: "goal",
        team,
        player:
          nested(raw, "Data", "Player") ??
          nested(raw, "dataSoccer", "reference", "player") ??
          pick(raw, "player", "Player"),
      });
    } else if (newScore) {
      this.score = newScore;
    }

    const stats = pick(raw, "Stats", "stats");
    const cardReads: Array<{
      key: keyof typeof this.cards;
      colour: "yellow" | "red";
      team: "home" | "away";
      count: number | undefined;
    }> = [
      {
        key: "homeYellow",
        colour: "yellow",
        team: "home",
        count:
          this.readCardFromScore(raw, "home", "yellow") ??
          (stats ? Number(stats[this.participant1IsHome ? "3" : "4"]) : undefined),
      },
      {
        key: "awayYellow",
        colour: "yellow",
        team: "away",
        count:
          this.readCardFromScore(raw, "away", "yellow") ??
          (stats ? Number(stats[this.participant1IsHome ? "4" : "3"]) : undefined),
      },
      {
        key: "homeRed",
        colour: "red",
        team: "home",
        count:
          this.readCardFromScore(raw, "home", "red") ??
          (stats ? Number(stats[this.participant1IsHome ? "5" : "6"]) : undefined),
      },
      {
        key: "awayRed",
        colour: "red",
        team: "away",
        count:
          this.readCardFromScore(raw, "away", "red") ??
          (stats ? Number(stats[this.participant1IsHome ? "6" : "5"]) : undefined),
      },
    ];

    for (const row of cardReads) {
      if (
        typeof row.count === "number" &&
        Number.isFinite(row.count) &&
        row.count > this.cards[row.key]
      ) {
        this.cards[row.key] = row.count;
        events.push({ ...this.base(raw, minute), type: "card", team: row.team, card: row.colour });
      }
    }

    if (action === "substitution") {
      events.push({ ...this.base(raw, minute), type: "substitution", team: this.sideOf(raw) });
    }

    if (this.isFinalPhase(raw)) {
      this.finished = true;
      events.push({ ...this.base(raw, Math.max(minute, 90)), type: "fulltime" });
    }

    return events;
  }

  oddsRecordToEvent(raw: RawRecord, throttleMs = 5000): MatchEvent | null {
    if (typeof raw !== "object" || raw === null) return null;
    const fid = fixtureIdOf(raw);
    if (fid !== undefined && fid !== this.fixtureId) return null;
    if (this.finished) return null;

    const marketPeriod = String(pick(raw, "MarketPeriod", "marketPeriod") ?? "").toLowerCase();
    if (marketPeriod && !/full|match|total|^$|game/.test(marketPeriod)) return null;
    const namesRaw = pick(raw, "PriceNames", "priceNames");
    const names: string[] = Array.isArray(namesRaw) ? namesRaw.map(String) : [];
    if (names.length !== 3) return null;

    const odds = this.extractThreeWayOdds(raw, names);
    if (!odds) return null;

    this.lastOdds = odds;

    const now =
      typeof pick(raw, "Ts", "ts") === "number" ? Number(pick(raw, "Ts", "ts")) : Date.now();
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
      [iHome, iDraw, iAway] = [0, 1, 2];
    }
    if (!this.participant1IsHome) [iHome, iAway] = [iAway, iHome];

    const pct: unknown[] = Array.isArray(pick(raw, "Pct", "pct")) ? pick(raw, "Pct", "pct") : [];
    const prices: unknown[] = Array.isArray(pick(raw, "Prices", "prices"))
      ? pick(raw, "Prices", "prices")
      : [];
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
