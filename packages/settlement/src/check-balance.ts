import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Connection, Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import bs58 from "bs58";

function loadDotEnv(): void {
  const here = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    join(here, "../../../.env"),
    join(process.cwd(), ".env"),
    join(process.cwd(), "../../.env"),
  ];
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
 * Operator helper: checks the agent wallet balance and retries the faucet
 * airdrop if empty. Run: npx tsx packages/settlement/src/check-balance.ts
 */
async function main() {
  loadDotEnv();
  const secret = process.env.AGENT_WALLET_SECRET_KEY;
  if (!secret) {
    console.error("AGENT_WALLET_SECRET_KEY not set.");
    process.exit(1);
  }
  const wallet = Keypair.fromSecretKey(bs58.decode(secret));
  const connection = new Connection(
    process.env.SOLANA_RPC_URL ?? "https://api.devnet.solana.com",
    "confirmed",
  );
  console.log("Wallet:", wallet.publicKey.toBase58());
  let balance = await connection.getBalance(wallet.publicKey);
  console.log("Balance:", balance / LAMPORTS_PER_SOL, "SOL");

  if (balance < 0.05 * LAMPORTS_PER_SOL) {
    try {
      console.log("Requesting 1 SOL airdrop...");
      const sig = await connection.requestAirdrop(wallet.publicKey, LAMPORTS_PER_SOL);
      const latest = await connection.getLatestBlockhash();
      await connection.confirmTransaction({ signature: sig, ...latest }, "confirmed");
      balance = await connection.getBalance(wallet.publicKey);
      console.log("Airdrop ok. Balance:", balance / LAMPORTS_PER_SOL, "SOL");
    } catch (err) {
      console.warn(
        "Airdrop failed — fund manually at https://faucet.solana.com:",
        err instanceof Error ? err.message : err,
      );
      process.exit(1);
    }
  }
}

main();
