import type { MatchEvent } from "@onside/ingestion";
import type { NarrationLine } from "@onside/narration-engine";
import type { SettlementProof } from "@onside/settlement";
import { createAgent } from "./agent.js";
import { loadConfig } from "./config.js";
import type { Decision } from "./agent.js";

/**
 * Phase 1 milestone: full pipeline headless in the console.
 * Run with: npm run demo:headless
 */
const config = loadConfig();
// Speed the console demo up unless the user pinned an interval.
if (process.env.REPLAY_INTERVAL_MS === undefined) config.replayIntervalMs = 400;

const agent = createAgent(config);

console.log(`\n⚽ Onside settling agent — ${agent.meta.competition}`);
console.log(`   ${agent.meta.homeTeam} vs ${agent.meta.awayTeam}`);
console.log(`   mode=${config.useReplayMode ? "replay" : "live TxLINE"}  settle-threshold=${config.settleThreshold}\n`);

agent.on("event", (e: MatchEvent) => {
  const odds = e.odds ? `  odds ${e.odds.home}/${e.odds.draw ?? "-"}/${e.odds.away}` : "";
  console.log(`[${String(e.minute).padStart(2)}'] ${e.type.toUpperCase().padEnd(12)} ${e.scoreHome}-${e.scoreAway}${odds}`);
});

agent.on("narration", (line: NarrationLine) => {
  console.log(`      🗣  ${line.text}`);
});

agent.on("decision", (d: Decision) => {
  if (d.action === "below_threshold") return;
  console.log(`      ⚖  decision: ${d.action.toUpperCase()} (rule ${d.signal.rule}, confidence ${d.signal.confidence}%)`);
});

agent.on("settlement", (proof: SettlementProof) => {
  console.log(`\n✅ SETTLED [${proof.mode}] outcome=${proof.finalOutcome} tx=${proof.txSignature}`);
  if (proof.explorerUrl) console.log(`   ${proof.explorerUrl}`);
});

agent.on("error", (err: Error) => console.error("   ⚠ error:", err.message));

agent.on("end", () => {
  // Give the async settlement a moment to land before exiting.
  setTimeout(() => {
    console.log(`\nPipeline complete. Decisions logged: ${agent.state.decisions.length}`);
    process.exit(0);
  }, 4000);
});

agent.start();
