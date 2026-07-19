import { createMatchEventSource, type MatchEvent } from "@onside/ingestion";
import { loadDotEnv } from "./env.js";

/**
 * Step B smoke test: USE_REPLAY_MODE=false → TxlineClient via the shared
 * MatchEventSource factory. Seeds from snapshot + listens to SSE briefly.
 *
 * Run: npm run txline:live-smoke
 * Requires TXLINE_API_TOKEN + TXLINE_FIXTURE_ID in .env
 */
async function main() {
  loadDotEnv();

  const apiUrl = process.env.TXLINE_API_URL ?? "https://txline-dev.txodds.com";
  const apiToken = process.env.TXLINE_API_TOKEN;
  const fixtureId = Number(process.env.TXLINE_FIXTURE_ID);

  if (!apiToken || !Number.isFinite(fixtureId)) {
    throw new Error(
      "Need TXLINE_API_TOKEN and TXLINE_FIXTURE_ID — run npm run txline:subscribe / set fixture id",
    );
  }

  console.log("=== TxLINE Step B live smoke ===");
  console.log("API:     ", apiUrl);
  console.log("Fixture: ", fixtureId);

  const source = createMatchEventSource({
    useReplayMode: false,
    replayIntervalMs: 0,
    txlineApiUrl: apiUrl,
    txlineApiToken: apiToken,
    txlineFixtureId: fixtureId,
  });

  const events: MatchEvent[] = [];

  source.on("event", (e) => {
    events.push(e);
    console.log(
      `  event ${e.type.padEnd(12)} ${e.minute}'  ${e.scoreHome}-${e.scoreAway}` +
        (e.team ? `  ${e.team}` : "") +
        (e.odds ? `  odds ${e.odds.home}/${e.odds.draw ?? "-"}/${e.odds.away}` : ""),
    );
  });
  source.on("error", (err) => console.warn("  stream warn:", err.message));
  source.on("end", () => console.log("  source end"));

  source.start();
  console.log("\nMeta:", source.meta);
  console.log("Listening 12s for snapshot seed + SSE…\n");

  await new Promise((r) => setTimeout(r, 12_000));
  source.stop();

  const byType = events.reduce<Record<string, number>>((acc, e) => {
    acc[e.type] = (acc[e.type] ?? 0) + 1;
    return acc;
  }, {});

  console.log("\nEmitted", events.length, "MatchEvent(s):", byType);
  if (events.length === 0) {
    throw new Error(
      "No MatchEvents emitted — check fixture has scores snapshot data, or wait for a live covered match",
    );
  }
  console.log("\nStep B OK — TxlineClient implements MatchEventSource and emits normalized events.");
}

main().catch((err) => {
  console.error("Step B FAILED:", err instanceof Error ? err.message : err);
  process.exit(1);
});
