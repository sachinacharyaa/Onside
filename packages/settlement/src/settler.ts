import { createHash } from "node:crypto";
import {
  ComputeBudgetProgram,
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
import {
  validateFinalOutcome,
  type TxlineApiAuth,
  type TxlineValidationResult,
} from "./txline-validation.js";

export type Outcome = "home" | "away" | "draw";

export type TxlineSettlementContext = {
  auth: TxlineApiAuth;
  /** TxLINE program id (devnet by default). */
  txlineProgramId: string;
  fixtureId: number;
  /** Observed seq from the live stream when available. */
  preferredSeq?: number;
};

export type SettlementProof = {
  matchId: string;
  finalOutcome: Outcome;
  txSignature: string;
  settledAt: string;
  triggeringSignal: Signal;
  explorerUrl: string;
  mode: "anchor" | "memo";
  /** Present when outcome was verified against TxLINE on-chain Merkle roots. */
  txline?: TxlineValidationResult;
};

export type SettlerConfig = {
  rpcUrl: string;
  /** base58-encoded secret key. Required for settlement. */
  walletSecretKey?: string;
  /** Deployed Onside Anchor program id. Empty → Memo-program proof tx. */
  programId?: string;
  /** When set, settlement first verifies the outcome via TxLINE validateStat. */
  txline?: TxlineSettlementContext;
};

const MEMO_PROGRAM_ID = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");
const OUTCOME_CODE: Record<Outcome, number> = { home: 0, away: 1, draw: 2 };

/** sha256 of the triggering signal payload — the on-chain data reference. */
export function proofHash(signal: Signal): Buffer {
  return createHash("sha256").update(JSON.stringify(signal)).digest();
}

function anchorDiscriminator(ixName: string): Buffer {
  return createHash("sha256").update(`global:${ixName}`).digest().subarray(0, 8);
}

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
 * When `config.txline` is set, first runs TxLINE validateStat against the
 * on-chain daily_scores_roots Merkle root, then embeds that verification in
 * the settlement memo / proof hash input.
 *
 * Throws if no wallet is configured, TxLINE validation fails, or RPC fails.
 * Never returns a fabricated / SIMULATED signature.
 */
export async function settleOnChain(
  config: SettlerConfig,
  matchId: string,
  outcome: Outcome,
  triggeringSignal: Signal,
): Promise<SettlementProof> {
  const settledAt = new Date().toISOString();

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

  let txline: TxlineValidationResult | undefined;
  if (config.txline) {
    txline = await validateFinalOutcome({
      auth: config.txline.auth,
      rpcUrl: config.rpcUrl,
      programId: config.txline.txlineProgramId,
      wallet,
      fixtureId: config.txline.fixtureId,
      outcome,
      preferredSeq: config.txline.preferredSeq,
    });
  }

  // Hash includes TxLINE verification when present so settle_market / memo
  // references the sponsor Merkle proof, not only our signal blob.
  const hash = createHash("sha256")
    .update(
      JSON.stringify({
        signal: triggeringSignal,
        txline: txline
          ? {
              fixtureId: txline.fixtureId,
              seq: txline.seq,
              homeGoals: txline.homeGoals,
              awayGoals: txline.awayGoals,
              dailyScoresPda: txline.dailyScoresPda,
              onChainViewPassed: txline.onChainViewPassed,
              validationTxSignature: txline.validationTxSignature,
            }
          : null,
      }),
    )
    .digest();

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
    // Keep memo compact — large UTF-8 payloads burn Memo CU past the 200k default.
    const memo = JSON.stringify({
      app: "onside",
      matchId,
      outcome,
      proof: hash.toString("hex").slice(0, 32),
      rule: triggeringSignal.rule,
      at: settledAt,
      txline: txline
        ? {
            ok: true,
            method: txline.method,
            fixture: txline.fixtureId,
            seq: txline.seq,
            score: `${txline.homeGoals}-${txline.awayGoals}`,
            valTx: txline.validationTxSignature,
          }
        : undefined,
    });
    instruction = new TransactionInstruction({
      programId: MEMO_PROGRAM_ID,
      keys: [{ pubkey: wallet.publicKey, isSigner: true, isWritable: false }],
      data: Buffer.from(memo, "utf8"),
    });
    mode = "memo";
  }

  const tx = new Transaction()
    .add(ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 }))
    .add(instruction);
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
    txline,
  };
}
