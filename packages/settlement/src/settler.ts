import { createHash } from "node:crypto";
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import bs58 from "bs58";
import type { Signal } from "@onside/signal-engine";

export type Outcome = "home" | "away" | "draw";

export type SettlementProof = {
  matchId: string;
  finalOutcome: Outcome;
  txSignature: string;
  settledAt: string;
  triggeringSignal: Signal;
  explorerUrl: string;
  mode: "anchor" | "memo";
};

export type SettlerConfig = {
  rpcUrl: string;
  /** base58-encoded secret key. Required for settlement. */
  walletSecretKey?: string;
  /** Deployed Anchor program id. Empty → Memo-program proof tx. */
  programId?: string;
};

const MEMO_PROGRAM_ID = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");
const OUTCOME_CODE: Record<Outcome, number> = { home: 0, away: 1, draw: 2 };

/** sha256 of the triggering signal payload — the on-chain data reference. */
export function proofHash(signal: Signal): Buffer {
  return createHash("sha256").update(JSON.stringify(signal)).digest();
}

/** Anchor instruction discriminator: first 8 bytes of sha256("global:settle_market"). */
function anchorDiscriminator(ixName: string): Buffer {
  return createHash("sha256").update(`global:${ixName}`).digest().subarray(0, 8);
}

/** Borsh-encode args for settle_market(match_id: String, outcome: u8, proof_hash: [u8;32]). */
function encodeSettleArgs(matchId: string, outcome: Outcome, hash: Buffer): Buffer {
  const idBytes = Buffer.from(matchId, "utf8");
  const lenPrefix = Buffer.alloc(4);
  lenPrefix.writeUInt32LE(idBytes.length);
  return Buffer.concat([
    anchorDiscriminator("settle_market"),
    lenPrefix,
    idBytes,
    Buffer.from([OUTCOME_CODE[outcome]]),
    hash,
  ]);
}

/**
 * Signs and submits the settlement transaction to Solana devnet.
 *
 * Modes:
 *  - "anchor": wallet + programId → settle_market on the deployed program
 *  - "memo":   wallet only → Memo program tx with proof JSON (real, clickable)
 *
 * Throws if no wallet is configured or the RPC submission fails.
 * Never returns a fabricated / SIMULATED signature.
 */
export async function settleOnChain(
  config: SettlerConfig,
  matchId: string,
  outcome: Outcome,
  triggeringSignal: Signal,
): Promise<SettlementProof> {
  const settledAt = new Date().toISOString();
  const hash = proofHash(triggeringSignal);

  if (!config.walletSecretKey) {
    throw new Error(
      "Settlement requires AGENT_WALLET_SECRET_KEY. Generate and fund a devnet wallet before settling.",
    );
  }

  const connection = new Connection(config.rpcUrl, "confirmed");
  const wallet = Keypair.fromSecretKey(bs58.decode(config.walletSecretKey));

  const balance = await connection.getBalance(wallet.publicKey);
  if (balance < 5_000) {
    throw new Error(
      `Agent wallet ${wallet.publicKey.toBase58()} is underfunded (${balance} lamports). Airdrop SOL on devnet and retry.`,
    );
  }

  let instruction: TransactionInstruction;
  let mode: SettlementProof["mode"];

  if (config.programId) {
    const programId = new PublicKey(config.programId);
    const [settlementPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("settlement"), Buffer.from(matchId, "utf8")],
      programId,
    );
    instruction = new TransactionInstruction({
      programId,
      keys: [
        { pubkey: settlementPda, isSigner: false, isWritable: true },
        { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data: encodeSettleArgs(matchId, outcome, hash),
    });
    mode = "anchor";
  } else {
    const memo = JSON.stringify({
      app: "onside-settling-agent",
      matchId,
      finalOutcome: outcome,
      proofHash: hash.toString("hex"),
      rule: triggeringSignal.rule,
      confidence: triggeringSignal.confidence,
      settledAt,
    });
    instruction = new TransactionInstruction({
      programId: MEMO_PROGRAM_ID,
      keys: [{ pubkey: wallet.publicKey, isSigner: true, isWritable: false }],
      data: Buffer.from(memo, "utf8"),
    });
    mode = "memo";
  }

  const tx = new Transaction().add(instruction);
  const txSignature = await sendAndConfirmTransaction(connection, tx, [wallet], {
    commitment: "confirmed",
  });

  return {
    matchId,
    finalOutcome: outcome,
    txSignature,
    settledAt,
    triggeringSignal,
    explorerUrl: `https://explorer.solana.com/tx/${txSignature}?cluster=devnet`,
    mode,
  };
}
