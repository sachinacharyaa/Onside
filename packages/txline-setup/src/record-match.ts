import { writeFileSync, copyFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { TxlineNormalizer, type MatchEvent, type MatchMeta } from "@onside/ingestion";
import { txlineApi } from "./api.js";

/**
 * Records a real (finished) TxLINE fixture into a replay JSON file, so the
 * judged demo can run REAL match data through the exact replay code path.
 *
 * Works for fixtures that started between two weeks and six hours ago
 * (TxLINE historical availability window).
 *
 * Historical scores are delivered as SSE (`text/event-stream`), not JSON.
 *
 * Run: npm run txline:record -- <fixtureId> [--sample]
 *   --sample  also writes packages/ingestion/replay-data/sample-match.json
 *             (after backing up any existing hand-built file once).
 */

/** Known covered fixtures when /api/fixtures/snapshot no longer lists them. */
const KNOWN_FIXTURES: Record<number, Omit<MatchMeta, "matchId" | "fixtureId" | "finalSeq">> = {
  18257865: {
    homeTeam: "France",
    awayTeam: "England",
    competition: "FIFA World Cup 2026 — 3rd Place Final",
  },
  18257739: {
    homeTeam: "Spain",
    awayTeam: "Argentina",
    competition: "FIFA World Cup 2026 — Final",
  },
  18241006: {
    homeTeam: "England",
    awayTeam: "Argentina",
    competition: "FIFA World Cup 2026 — Semi-final",
  },
  18237038: {
    homeTeam: "France",
    awayTeam: "Spain",
    competition: "FIFA World Cup 2026 — Semi-final",
  },
};

async function main() {
  const args = process.argv.slice(2).filter((a) => a !== "--");
  const writeSample =
    args.includes("--sample") ||
    args.includes("sample") ||
    process.env.WRITE_SAMPLE === "1";
  const idArg = args.find((a) => !a.startsWith("-") && a !== "sample");
  const fixtureId = Number(idArg ?? process.env.TXLINE_FIXTURE_ID);
  if (!fixtureId) {
    console.error("Usage: npm run txline:record -- <fixtureId> [--sample]");
    process.exit(1);
  }

  const api = await txlineApi();
  const normalizer = new TxlineNormalizer(fixtureId);

  let meta: MatchMeta = {
    matchId: `txline-${fixtureId}`,
    fixtureId,
    homeTeam: "Home",
    awayTeam: "Away",
    competition: "TxLINE recorded match",
    ...(KNOWN_FIXTURES[fixtureId] ?? {}),
  };
  try {
    const fixtures = (await api.get("/api/fixtures/snapshot")) as any[];
    const fixture = fixtures.find((f) => Number(f.FixtureId ?? f.fixtureId) === fixtureId);
    if (fixture) {
      const p1IsHome = fixture.Participant1IsHome ?? true;
      meta = {
        ...meta,
        homeTeam: p1IsHome ? fixture.Participant1 : fixture.Participant2,
        awayTeam: p1IsHome ? fixture.Participant2 : fixture.Participant1,
        competition: String(fixture.Competition ?? meta.competition),
      };
    }
  } catch {
    /* snapshot may not include finished fixtures */
  }

  // Full score history — SSE stream of records.
  const scoreRecords = (await api.getRecords(`/api/scores/historical/${fixtureId}`)) as any[];
  console.log(`Fetched ${scoreRecords.length} historical score records`);
  if (scoreRecords.length === 0) {
    console.error(
      "No historical data — the fixture must have started between two weeks and six hours ago.",
    );
    process.exit(1);
  }
  scoreRecords.sort(
    (a, b) => Number(a.Seq ?? a.seq ?? 0) - Number(b.Seq ?? b.seq ?? 0),
  );

  const finalRecord = [...scoreRecords]
    .reverse()
    .find((r) => String(r.Action ?? r.action ?? "").toLowerCase() === "game_finalised");
  if (finalRecord) {
    meta.finalSeq = Number(finalRecord.Seq ?? finalRecord.seq);
  }

  const tsValues = scoreRecords
    .map((r) => Number(r.Ts ?? r.ts))
    .filter((t) => Number.isFinite(t) && t > 0);

  // Odds only around the live match window (skip days of pre-match noise).
  const liveTs = scoreRecords
    .filter((r) => {
      const status = Number(r.StatusId ?? r.statusId);
      const action = String(r.Action ?? r.action ?? "").toLowerCase();
      return status === 2 || status === 4 || action === "kick_off" || action === "goal";
    })
    .map((r) => Number(r.Ts ?? r.ts))
    .filter((t) => Number.isFinite(t) && t > 0);
  const finalTs = finalRecord
    ? Number(finalRecord.Ts ?? finalRecord.ts)
    : Math.max(...tsValues);
  const fromMs =
    (liveTs.length ? Math.min(...liveTs) : Math.min(...tsValues)) - 15 * 60_000;
  const toMs = Number.isFinite(finalTs) ? finalTs + 5 * 60_000 : Math.max(...tsValues);
  const oddsRecords: any[] = [];
  for (let t = fromMs; t <= toMs; t += 5 * 60_000) {
    const epochDay = Math.floor(t / 86_400_000);
    const hourOfDay = Math.floor((t % 86_400_000) / 3_600_000);
    const interval = Math.floor((t % 3_600_000) / 300_000);
    try {
      const batch = (await api.getRecords(
        `/api/odds/updates/${epochDay}/${hourOfDay}/${interval}?fixtureId=${fixtureId}`,
      )) as any[];
      oddsRecords.push(
        ...batch.filter((r) => {
          const ts = Number(r.Ts ?? r.ts);
          return Number.isFinite(ts) && ts >= fromMs && ts <= toMs;
        }),
      );
    } catch {
      /* interval outside retention or empty */
    }
  }
  console.log(`Fetched ${oddsRecords.length} odds updates (match window only)`);

  // Merge chronologically and normalize through the exact same code path
  // the live client uses. Odds throttled to ~3 min of match time so the
  // decision log stays narratable in a 2-minute demo.
  const merged: { ts: number; kind: "score" | "odds"; record: any }[] = [
    ...scoreRecords.map((r) => ({
      ts: Number(r.Ts ?? r.ts) || 0,
      kind: "score" as const,
      record: r,
    })),
    ...oddsRecords.map((r) => ({
      ts: Number(r.Ts ?? r.ts) || 0,
      kind: "odds" as const,
      record: r,
    })),
  ].sort((a, b) => a.ts - b.ts);

  const events: MatchEvent[] = [];
  for (const item of merged) {
    if (item.kind === "score") {
      events.push(...normalizer.scoreRecordToEvents(item.record));
    } else {
      const event = normalizer.oddsRecordToEvent(item.record, 180_000);
      if (event) events.push(event);
    }
  }

  // Keep odds ticks that actually swing the 1X2 line (or open/close the book).
  const trimmed: MatchEvent[] = [];
  let lastOdds: { home: number; away: number } | null = null;
  for (const event of events) {
    if (event.type !== "odds_tick" || !event.odds) {
      trimmed.push(event);
      continue;
    }
    if (!lastOdds) {
      trimmed.push(event);
      lastOdds = { home: event.odds.home, away: event.odds.away };
      continue;
    }
    const homeMove = Math.abs(event.odds.home - lastOdds.home) / lastOdds.home;
    const awayMove = Math.abs(event.odds.away - lastOdds.away) / lastOdds.away;
    if (homeMove >= 0.04 || awayMove >= 0.04) {
      trimmed.push(event);
      lastOdds = { home: event.odds.home, away: event.odds.away };
    }
  }
  events.length = 0;
  events.push(...trimmed);

  const goals = events.filter((e) => e.type === "goal").length;
  const oddsTicks = events.filter((e) => e.type === "odds_tick").length;
  console.log(
    `Normalized into ${events.length} MatchEvents (${goals} goals, ${oddsTicks} odds ticks)`,
  );
  if (!events.some((e) => e.type === "fulltime")) {
    console.warn("Warning: no fulltime event found — the agent will not settle on this replay.");
  } else {
    console.log(
      `Final: ${meta.homeTeam} ${events.at(-1)?.scoreHome}-${events.at(-1)?.scoreAway} ${meta.awayTeam}` +
        (meta.finalSeq != null ? ` (seq ${meta.finalSeq})` : ""),
    );
  }

  const here = dirname(fileURLToPath(import.meta.url));
  const replayDir = join(here, "../../ingestion/replay-data");
  const outPath = join(replayDir, `txline-${fixtureId}.json`);
  const payload = JSON.stringify({ meta, events }, null, 2);
  writeFileSync(outPath, payload);
  console.log(`\nWrote ${outPath}`);

  if (writeSample) {
    const samplePath = join(replayDir, "sample-match.json");
    const backupPath = join(replayDir, "sample-match.hand-built.json");
    if (existsSync(samplePath) && !existsSync(backupPath)) {
      copyFileSync(samplePath, backupPath);
      console.log(`Backed up previous sample → ${backupPath}`);
    }
    writeFileSync(samplePath, payload);
    console.log(`Wrote primary demo sample → ${samplePath}`);
  }

  console.log(`Set REPLAY_FILE=txline-${fixtureId}.json (or use sample-match.json) in .env.`);
  console.log(`Recommended: REPLAY_SPEED=60  (~2 min for a full match)`);
}

main().catch((err) => {
  console.error("Failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
