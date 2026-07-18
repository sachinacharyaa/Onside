import { Connection, Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import bs58 from "bs58";

/**
 * Operator helper: checks the agent wallet balance and retries the faucet
 * airdrop if empty. Run: npx tsx packages/settlement/src/check-balance.ts
 */
async function main() {
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

  if (balance === 0) {
    try {
      console.log("Requesting 1 SOL airdrop...");
      const sig = await connection.requestAirdrop(wallet.publicKey, LAMPORTS_PER_SOL);
      await connection.confirmTransaction(sig, "confirmed");
      balance = await connection.getBalance(wallet.publicKey);
      console.log("Airdrop ok. Balance:", balance / LAMPORTS_PER_SOL, "SOL");
    } catch (err) {
      console.warn(
        "Airdrop failed — fund manually at https://faucet.solana.com:",
        err instanceof Error ? err.message : err,
      );
    }
  }
}

main();
