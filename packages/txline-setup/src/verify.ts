import { Connection, Keypair } from "@solana/web3.js";
import bs58 from "bs58";
import { loadDotEnv, txlineNetwork } from "./env.js";
import { txlineApi } from "./api.js";

/**
 * Step A smoke test: wallet funded, API token present, real scores snapshot.
 * Run: npm run txline:verify --workspace=@onside/txline-setup
 */
async function main() {
  loadDotEnv();
  const net = txlineNetwork();
  const secret = process.env.AGENT_WALLET_SECRET_KEY;
  if (!secret) throw new Error("AGENT_WALLET_SECRET_KEY missing");

  const keypair = Keypair.fromSecretKey(bs58.decode(secret));
  const connection = new Connection(process.env.SOLANA_RPC_URL ?? net.rpcUrl, "confirmed");
  const balance = await connection.getBalance(keypair.publicKey);

  console.log("=== TxLINE Step A verify ===");
  console.log("Network: ", net.apiOrigin);
  console.log("Program: ", net.programId);
  console.log("Wallet:  ", keypair.publicKey.toBase58());
  console.log("Balance: ", balance / 1e9, "SOL");
  console.log("Token:   ", process.env.TXLINE_API_TOKEN ? "present" : "MISSING");

  if (!process.env.TXLINE_API_TOKEN) {
    throw new Error("TXLINE_API_TOKEN missing — run npm run txline:subscribe first");
  }
  if (balance === 0) {
    throw new Error("Wallet has 0 SOL — fund before subscribe/settlement");
  }

  const api = await txlineApi();
  const fixtures = (await api.get("/api/fixtures/snapshot")) as any[];
  console.log("\nFixtures snapshot:", fixtures.length, "rows");

  const fixtureId = Number(process.env.TXLINE_FIXTURE_ID ?? fixtures[0]?.FixtureId ?? fixtures[0]?.fixtureId);
  if (!Number.isFinite(fixtureId)) throw new Error("No fixture id available");

  const scores = (await api.get(`/api/scores/snapshot/${fixtureId}`)) as any;
  const row = Array.isArray(scores) ? scores[0] : scores;
  console.log("Scores snapshot for fixture", fixtureId, ":");
  console.log(
    JSON.stringify(
      {
        FixtureId: row?.FixtureId ?? row?.fixtureId,
        GameState: row?.GameState ?? row?.gameState,
        StartTime: row?.StartTime ?? row?.startTime,
        Participant1Id: row?.Participant1Id ?? row?.participant1Id,
        Participant2Id: row?.Participant2Id ?? row?.participant2Id,
        CompetitionId: row?.CompetitionId ?? row?.competitionId,
      },
      null,
      2,
    ),
  );

  console.log("\nStep A OK — guest JWT + API token can fetch real TxLINE data.");
}

main().catch((err) => {
  console.error("Step A FAILED:", err instanceof Error ? err.message : err);
  process.exit(1);
});
