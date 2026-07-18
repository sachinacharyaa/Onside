import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import * as anchor from "@coral-xyz/anchor";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import { Connection, Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import bs58 from "bs58";
import nacl from "tweetnacl";
import { loadDotEnv, txlineNetwork } from "./env.js";

/**
 * One-time TxLINE World Cup free-tier onboarding (devnet by default):
 *
 *   1. subscribe(serviceLevelId, durationWeeks) on the TxLINE program
 *   2. get a guest JWT from /auth/guest/start
 *   3. sign `${txSig}::${jwt}` with the same wallet
 *   4. POST /api/token/activate -> long-lived API token
 *   5. write TXLINE_API_TOKEN into .env
 *
 * Requires: AGENT_WALLET_SECRET_KEY in .env and devnet SOL on that wallet
 * (free tier costs no TxL, but the subscribe tx pays normal Solana fees).
 *
 * Run: npm run txline:subscribe
 * Docs: https://txline.txodds.com/documentation/worldcup
 */

const SERVICE_LEVEL_ID = Number(process.env.TXLINE_SERVICE_LEVEL ?? 1);
const DURATION_WEEKS = 4;
const SELECTED_LEAGUES: number[] = []; // empty = standard free bundle

async function main() {
  loadDotEnv();
  const net = txlineNetwork();

  const secret = process.env.AGENT_WALLET_SECRET_KEY;
  if (!secret) {
    console.error("AGENT_WALLET_SECRET_KEY missing in .env — run `npm run wallet:generate` first.");
    process.exit(1);
  }
  const keypair = Keypair.fromSecretKey(bs58.decode(secret));
  console.log("Network:  ", net.apiOrigin);
  console.log("Wallet:   ", keypair.publicKey.toBase58());

  const connection = new Connection(process.env.SOLANA_RPC_URL ?? net.rpcUrl, "confirmed");
  const balance = await connection.getBalance(keypair.publicKey);
  console.log("Balance:  ", balance / 1e9, "SOL");
  if (balance === 0) {
    console.error(
      "Wallet has no SOL — the subscribe tx needs fees/rent. Fund it at https://faucet.solana.com and re-run.",
    );
    process.exit(1);
  }

  // ── 1. on-chain subscribe ──────────────────────────────────────────
  const wallet = new anchor.Wallet(keypair);
  const provider = new anchor.AnchorProvider(connection, wallet, { commitment: "confirmed" });
  anchor.setProvider(provider);

  const programId = new PublicKey(net.programId);
  const txlTokenMint = new PublicKey(net.txlTokenMint);

  const idl = await anchor.Program.fetchIdl(programId, provider);
  if (!idl) {
    console.error(
      "Could not fetch the TxLINE IDL from chain. Download examples/devnet/idl/txoracle.json from the TxLINE repo and adapt this script.",
    );
    process.exit(1);
  }
  const program = new anchor.Program(idl, provider);

  const [tokenTreasuryPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("token_treasury_v2")],
    programId,
  );
  const tokenTreasuryVault = getAssociatedTokenAddressSync(
    txlTokenMint,
    tokenTreasuryPda,
    true,
    TOKEN_2022_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID,
  );
  const [pricingMatrixPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("pricing_matrix")],
    programId,
  );
  const userTokenAccount = getAssociatedTokenAddressSync(
    txlTokenMint,
    keypair.publicKey,
    false,
    TOKEN_2022_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID,
  );

  console.log(`\nSubscribing: service level ${SERVICE_LEVEL_ID}, ${DURATION_WEEKS} weeks...`);
  const txSig = await program.methods
    .subscribe(SERVICE_LEVEL_ID, DURATION_WEEKS)
    .accounts({
      user: keypair.publicKey,
      pricingMatrix: pricingMatrixPda,
      tokenMint: txlTokenMint,
      userTokenAccount,
      tokenTreasuryVault,
      tokenTreasuryPda,
      tokenProgram: TOKEN_2022_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .rpc();
  console.log("Subscribe tx:", txSig);

  // ── 2-4. guest JWT -> sign -> activate ─────────────────────────────
  const authRes = await fetch(`${net.apiOrigin}/auth/guest/start`, { method: "POST" });
  if (!authRes.ok) throw new Error(`guest auth failed: ${authRes.status}`);
  const { token: jwt } = (await authRes.json()) as { token: string };

  const messageString = `${txSig}:${SELECTED_LEAGUES.join(",")}:${jwt}`;
  const signature = nacl.sign.detached(new TextEncoder().encode(messageString), keypair.secretKey);
  const walletSignature = Buffer.from(signature).toString("base64");

  const activateRes = await fetch(`${net.apiOrigin}/api/token/activate`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${jwt}` },
    body: JSON.stringify({ txSig, walletSignature, leagues: SELECTED_LEAGUES }),
  });
  if (!activateRes.ok) {
    throw new Error(`activation failed: ${activateRes.status} ${await activateRes.text()}`);
  }
  const activation = (await activateRes.json()) as { token?: string } | string;
  const apiToken = typeof activation === "string" ? activation : (activation.token ?? "");
  if (!apiToken) throw new Error("activation response contained no token");

  console.log("\nAPI token activated.");

  // ── 5. persist into .env ───────────────────────────────────────────
  const envPath = join(process.cwd(), ".env");
  if (existsSync(envPath)) {
    let env = readFileSync(envPath, "utf8");
    const setVar = (key: string, value: string) => {
      env = env.match(new RegExp(`^${key}=`, "m"))
        ? env.replace(new RegExp(`^${key}=.*$`, "m"), `${key}=${value}`)
        : `${env.trimEnd()}\n${key}=${value}\n`;
    };
    setVar("TXLINE_API_URL", net.apiOrigin);
    setVar("TXLINE_API_TOKEN", apiToken);
    writeFileSync(envPath, env);
    console.log("Saved TXLINE_API_URL and TXLINE_API_TOKEN to .env");
  } else {
    console.log("TXLINE_API_TOKEN=", apiToken);
  }
  console.log(
    "\nNext: `npm run txline:fixtures` to pick a fixture id, set TXLINE_FIXTURE_ID and USE_REPLAY_MODE=false in .env.",
  );
}

main().catch((err) => {
  console.error("Failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
