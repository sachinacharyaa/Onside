import { Connection, Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import bs58 from "bs58";

/**
 * One-off helper: generates a devnet keypair, prints the base58 secret for
 * .env, and tries a faucet airdrop. Run: npm run wallet:generate
 */
async function main() {
  const keypair = Keypair.generate();
  console.log("Public key:            ", keypair.publicKey.toBase58());
  console.log("AGENT_WALLET_SECRET_KEY=", bs58.encode(keypair.secretKey));
  console.log("\nPaste the secret line into your .env, then pre-fund well before demo day.");

  const rpcUrl = process.env.SOLANA_RPC_URL ?? "https://api.devnet.solana.com";
  try {
    const connection = new Connection(rpcUrl, "confirmed");
    console.log("\nRequesting 1 SOL airdrop on devnet...");
    const sig = await connection.requestAirdrop(keypair.publicKey, LAMPORTS_PER_SOL);
    await connection.confirmTransaction(sig, "confirmed");
    console.log("Airdrop confirmed:", sig);
  } catch (err) {
    console.warn(
      "Airdrop failed (faucet rate limit is common). Fund manually at https://faucet.solana.com —",
      err instanceof Error ? err.message : err,
    );
  }
}

main();
