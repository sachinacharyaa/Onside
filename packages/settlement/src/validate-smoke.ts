import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Connection, Keypair } from "@solana/web3.js";
import bs58 from "bs58";
import { settleOnChain } from "./settler.js";
import type { Signal } from "@onside/signal-engine";

function loadDotEnv(): void {
  const here = dirname(fileURLToPath(import.meta.url));
  const candidates = [join(here, "../../../.env"), join(process.cwd(), ".env")];
  const envPath = candidates.find((p) => existsSync(p));
  if (!envPath) return;
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (!match) continue;
    const [, key, raw] = match;
    const value = raw.replace(/\s+#.*$/, "").trim();
    if (process.env[key] === undefined && value !== "") process.env[key] = value;
  }
}

/**
 * Step C smoke: TxLINE validateStat + memo settlement referencing it.
 * Uses fixture TXLINE_FIXTURE_ID (must have a game_finalised record).
 *
 * Run: npm run validate-smoke --workspace=@onside/settlement
 */
async function main() {
  loadDotEnv();
  const secret = process.env.AGENT_WALLET_SECRET_KEY;
  const apiUrl = process.env.TXLINE_API_URL ?? "https://txline-dev.txodds.com";
  const apiToken = process.env.TXLINE_API_TOKEN;
  const fixtureId = Number(process.env.TXLINE_FIXTURE_ID);
  const programId =
    process.env.TXLINE_PROGRAM_ID ?? "6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J";
  const rpcUrl = process.env.SOLANA_RPC_URL ?? "https://api.devnet.solana.com";

  if (!secret || !apiToken || !Number.isFinite(fixtureId)) {
    throw new Error("Need AGENT_WALLET_SECRET_KEY, TXLINE_API_TOKEN, TXLINE_FIXTURE_ID");
  }

  const wallet = Keypair.fromSecretKey(bs58.decode(secret));
  const bal = await new Connection(rpcUrl, "confirmed").getBalance(wallet.publicKey);
  console.log("=== Step C validate + settle smoke ===");
  console.log("Wallet:", wallet.publicKey.toBase58(), "bal", bal / 1e9);
  console.log("Fixture:", fixtureId);

  // Discover final score to choose outcome for the test settle.
  const {token: jwt} = await (await fetch(`${apiUrl}/auth/guest/start`, { method: "POST" })).json() as {token:string};
  const scores = await (
    await fetch(`${apiUrl}/api/scores/snapshot/${fixtureId}`, {
      headers: { Authorization: `Bearer ${jwt}`, "X-Api-Token": apiToken },
    })
  ).json() as any[];
  const final = [...scores]
    .reverse()
    .find((r) => String(r.Action ?? "").toLowerCase() === "game_finalised");
  if (!final?.Score) throw new Error("No game_finalised record with Score on this fixture");
  const p1 = final.Score.Participant1.Total.Goals;
  const p2 = final.Score.Participant2.Total.Goals;
  const p1Home = final.Participant1IsHome ?? true;
  const home = p1Home ? p1 : p2;
  const away = p1Home ? p2 : p1;
  const outcome = home > away ? "home" : home < away ? "away" : "draw";
  console.log(`Final score ${home}-${away} → settle ${outcome} (seq ${final.Seq})`);

  const signal: Signal = {
    id: `smoke-txline-${fixtureId}-${final.Seq}`,
    rule: "SCORE_CHANGE",
    confidence: 100,
    suggestedAction:
      outcome === "home" ? "SETTLE_HOME" : outcome === "away" ? "SETTLE_AWAY" : "SETTLE_DRAW",
    triggeredBy: {
      matchId: `txline-${fixtureId}`,
      minute: 90,
      type: "fulltime",
      scoreHome: home,
      scoreAway: away,
      timestamp: new Date().toISOString(),
    },
  };

  const proof = await settleOnChain(
    {
      rpcUrl,
      walletSecretKey: secret,
      txline: {
        auth: { apiUrl, apiToken },
        txlineProgramId: programId,
        fixtureId,
        preferredSeq: Number(final.Seq),
      },
    },
    `txline-${fixtureId}`,
    outcome,
    signal,
  );

  console.log("\nSettlement mode:", proof.mode);
  console.log("Tx:", proof.explorerUrl);
  console.log("TxLINE verified:", proof.txline?.onChainViewPassed, proof.txline);
  if (!proof.txline?.onChainViewPassed) {
    throw new Error("Expected TxLINE on-chain view to pass");
  }

  try {
    const { mkdirSync, writeFileSync } = await import("node:fs");
    const { dirname, join } = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const out = join(dirname(fileURLToPath(import.meta.url)), "../../../apps/web/.data/last-settlement.json");
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, JSON.stringify(proof, null, 2));
    console.log("Saved", out);
  } catch (e) {
    console.warn("Could not save proof file", e);
  }

  console.log("\nStep C OK — Merkle validation + settlement tx both real.");
}

main().catch((err) => {
  console.error("Step C FAILED:", err instanceof Error ? err.message : err);
  process.exit(1);
});
