import { txlineApi } from "./api.js";

/**
 * Lists TxLINE fixtures available on your subscription so you can pick a
 * TXLINE_FIXTURE_ID. Run: npm run txline:fixtures
 */
async function main() {
  const api = await txlineApi();
  const fixtures = (await api.get("/api/fixtures/snapshot")) as any[];
  console.log(`${fixtures.length} fixtures available on ${api.apiOrigin}\n`);

  const rows = fixtures
    .map((f) => ({
      id: f.FixtureId ?? f.fixtureId,
      start: new Date(f.StartTime ?? f.startTime).toISOString(),
      home: (f.Participant1IsHome ?? true) ? f.Participant1 : f.Participant2,
      away: (f.Participant1IsHome ?? true) ? f.Participant2 : f.Participant1,
      state: f.GameState ?? f.gameState,
    }))
    .sort((a, b) => String(a.start).localeCompare(String(b.start)));

  for (const row of rows) {
    console.log(`${row.id}  ${row.start}  ${row.home} vs ${row.away}  (state ${row.state})`);
  }
  console.log("\nSet TXLINE_FIXTURE_ID=<id> and USE_REPLAY_MODE=false in .env to go live.");
}

main().catch((err) => {
  console.error("Failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
