import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { TxlineNormalizer, type MatchEvent } from "@onside/ingestion";
import { txlineApi } from "./api.js";

/**
 * Records a real (finished) TxLINE fixture into a replay JSON file, so the
 * judged demo can run REAL match data through the exact replay code path.
 *
 * Works for fixtures that started between two weeks and six hours ago
 * (TxLINE historical availability window).
 *
 * Run: npm run txline:record -- <fixtureId>
 */
async function main() {
  const fixtureId = Number(process.argv[2] ?? process.env.TXLINE_FIXTURE_ID);
  if (!fixtureId) {
    console.error("Usage: npm run txline:record -- <fixtureId>");
    process.exit(1);
  }

  const api = await txlineApi();
  const normalizer = new TxlineNormalizer(fixtureId);

  // Meta from the fixtures snapshot (best effort).
  let meta = {
    matchId: `txline-${fixtureId}`,
    homeTeam: "Home",
    awayTeam: "Away",
    competition: "TxLINE recorded match",
  };
  try {
    const fixtures = (await api.get("/api/fixtures/snapshot")) as any[];
    const fixture = fixtures.find((f) => Number(f.FixtureId ?? f.fixtureId) === fixtureId);
    if (fixture) {
      const p1IsHome = fixture.Participant1IsHome ?? true;
      meta = {
        matchId: `txline-${fixtureId}`,
        homeTeam: p1IsHome ? fixture.Participant1 : fixture.Participant2,
        awayTeam: p1IsHome ? fixture.Participant2 : fixture.Participant1,
        competition: String(fixture.Competition ?? "TxLINE recorded match"),
      };
    }
  } catch {
    /* snapshot may not include old fixtures */
  }

  // Full score history for the fixture.
  const scoreRecords = (await api.get(`/api/scores/historical/${fixtureId}`)) as any[];
  console.log(`Fetched ${scoreRecords.length} historical score records`);
  if (scoreRecords.length === 0) {
    console.error(
      "No historical data — the fixture must have started between two weeks and six hours ago.",
    );
    process.exit(1);
  }
  scoreRecords.sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0));

  // Odds updates across the match window, one 5-minute interval at a time.
  const tsValues = scoreRecords.map((r) => Number(r.ts)).filter((t) => Number.isFinite(t) && t > 0);
  const fromMs = Math.min(...tsValues) - 10 * 60_000;
  const toMs = Math.max(...tsValues);
  const oddsRecords: any[] = [];
  for (let t = fromMs; t <= toMs; t += 5 * 60_000) {
    const epochDay = Math.floor(t / 86_400_000);
    const hourOfDay = Math.floor((t % 86_400_000) / 3_600_000);
    const interval = Math.floor((t % 3_600_000) / 300_000);
    try {
      const batch = (await api.get(
        `/api/odds/updates/${epochDay}/${hourOfDay}/${interval}?fixtureId=${fixtureId}`,
      )) as any[];
      oddsRecords.push(...batch);
    } catch {
      /* interval outside retention or empty */
    }
  }
  console.log(`Fetched ${oddsRecords.length} odds updates`);

  // Merge chronologically and normalize through the exact same code path
  // the live client uses.
  const merged: { ts: number; kind: "score" | "odds"; record: any }[] = [
    ...scoreRecords.map((r) => ({ ts: Number(r.ts) || 0, kind: "score" as const, record: r })),
    ...oddsRecords.map((r) => ({ ts: Number(r.Ts ?? r.ts) || 0, kind: "odds" as const, record: r })),
  ].sort((a, b) => a.ts - b.ts);

  const events: MatchEvent[] = [];
  for (const item of merged) {
    if (item.kind === "score") {
      events.push(...normalizer.scoreRecordToEvents(item.record));
    } else {
      const event = normalizer.oddsRecordToEvent(item.record, 60_000);
      if (event) events.push(event);
    }
  }

  console.log(`Normalized into ${events.length} MatchEvents`);
  if (!events.some((e) => e.type === "fulltime")) {
    console.warn("Warning: no fulltime event found — the agent will not settle on this replay.");
  }

  const here = dirname(fileURLToPath(import.meta.url));
  const outPath = join(here, "../../ingestion/replay-data", `txline-${fixtureId}.json`);
  writeFileSync(outPath, JSON.stringify({ meta, events }, null, 2));
  console.log(`\nWrote ${outPath}`);
  console.log(`Set REPLAY_FILE=txline-${fixtureId}.json in .env to replay real match data.`);
}

main().catch((err) => {
  console.error("Failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
