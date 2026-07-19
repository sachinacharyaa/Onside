import type { MatchEvent } from "@onside/ingestion";
import type { NarrationLine } from "@onside/narration-engine";
import type { SettlementProof } from "@onside/settlement";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createAgent } from "./agent.js";
import { loadConfig } from "./config.js";
import type { Decision } from "./agent.js";

/**
 * Phase 1 milestone: full pipeline headless in the console.
 * Run with: npm run demo:headless
 */
const config = loadConfig();
// Prefer timestamp compression for historical demos; fall back to a fast
// fixed interval only when REPLAY_SPEED is unset.
if (process.env.REPLAY_SPEED === undefined && process.env.REPLAY_INTERVAL_MS === undefined) {
  config.replaySpeed = 90;
}

if (!config.walletSecretKey) {
  console.error("AGENT_WALLET_SECRET_KEY is missing. Settlement cannot run without a funded wallet.");
  process.exit(1);
}

const agent = createAgent(config);
const here = dirname(fileURLToPath(import.meta.url));
const outPath = join(here, "../../../apps/web/.data/last-settlement.json");

console.log(`\n⚽ Onside settling agent — ${agent.meta.competition}`);
console.log(`   ${agent.meta.homeTeam} vs ${agent.meta.awayTeam}`);
console.log(
  `   mode=${config.useReplayMode ? "replay" : "live TxLINE"}  settle-threshold=${config.settleThreshold}\n`,
);

agent.on("event", (e: MatchEvent) => {
  const odds = e.odds ? `  odds ${e.odds.home}/${e.odds.draw ?? "-"}/${e.odds.away}` : "";
  console.log(
    `[${String(e.minute).padStart(2)}'] ${e.type.toUpperCase().padEnd(12)} ${e.scoreHome}-${e.scoreAway}${odds}`,
  );
});

agent.on("narration", (line: NarrationLine) => {
  console.log(`      🗣  ${line.text}`);
});

agent.on("decision", (d: Decision) => {
  console.log(
    `      ⚖  decision: ${d.action.toUpperCase()} (rule ${d.signal.rule}, confidence ${d.signal.confidence}%)`,
  );
});

agent.on("settlement", (proof: SettlementProof) => {
  console.log(`\n✅ SETTLED [${proof.mode}] outcome=${proof.finalOutcome} tx=${proof.txSignature}`);
  console.log(`   ${proof.explorerUrl}`);
  try {
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, JSON.stringify(proof, null, 2));
    console.log(`   saved ${outPath}`);
  } catch (err) {
    console.warn("   could not save proof file:", err);
  }
  setTimeout(() => process.exit(0), 500);
});

agent.on("settlement:failed", ({ message }: { message: string }) => {
  console.error(`\n❌ SETTLEMENT FAILED: ${message}`);
  setTimeout(() => process.exit(1), 300);
});

agent.on("error", (err: Error) => console.error("   ⚠ error:", err.message));

agent.on("end", () => {
  // Settlement is async; give it time. Exit codes handled by settlement handlers.
  setTimeout(() => {
    if (agent.state.settlement !== "settled" && agent.state.settlement !== "failed") {
      console.error("\nPipeline ended without settlement.");
      process.exit(1);
    }
  }, 20000);
});

agent.start();
