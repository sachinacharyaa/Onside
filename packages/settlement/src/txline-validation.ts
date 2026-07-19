import * as anchor from "@coral-xyz/anchor";
import {
  ComputeBudgetProgram,
  Connection,
  Keypair,
  PublicKey,
} from "@solana/web3.js";
import BN from "bn.js";
import type { Outcome } from "./settler.js";

/** TxLINE soccer total-goals keys (full game). */
export const STAT_KEY_P1_GOALS = 1;
export const STAT_KEY_P2_GOALS = 2;

export type TxlineValidationResult = {
  verified: true;
  method: "validateStat";
  fixtureId: number;
  seq: number;
  statKeys: number[];
  homeGoals: number;
  awayGoals: number;
  participant1IsHome: boolean;
  targetTs: number;
  dailyScoresPda: string;
  programId: string;
  /** validate_stat landed against on-chain Merkle roots (not a view — real tx). */
  onChainViewPassed: boolean;
  validationTxSignature?: string;
  validationExplorerUrl?: string;
};

export type TxlineApiAuth = {
  apiUrl: string;
  apiToken: string;
};

type ProofNode = { hash: string | number[] | Uint8Array; isRightSibling: boolean };

function toBytes32(value: string | number[] | Uint8Array): number[] {
  const bytes = Array.isArray(value)
    ? Uint8Array.from(value)
    : value instanceof Uint8Array
      ? value
      : typeof value === "string" && value.startsWith("0x")
        ? Buffer.from(value.slice(2), "hex")
        : typeof value === "string"
          ? Buffer.from(value, "base64")
          : Uint8Array.from(value as number[]);
  if (bytes.length !== 32) {
    throw new Error(`Expected 32-byte hash, got ${bytes.length}`);
  }
  return Array.from(bytes);
}

function toProofNodes(nodes: ProofNode[]) {
  return (nodes ?? []).map((node) => ({
    hash: toBytes32(node.hash),
    isRightSibling: Boolean(node.isRightSibling),
  }));
}

async function guestJwt(apiUrl: string): Promise<string> {
  const res = await fetch(`${apiUrl.replace(/\/$/, "")}/auth/guest/start`, { method: "POST" });
  if (!res.ok) throw new Error(`TxLINE guest auth failed: ${res.status}`);
  const body = (await res.json()) as { token: string };
  return body.token;
}

async function txlineGet(auth: TxlineApiAuth, path: string): Promise<any> {
  const base = auth.apiUrl.replace(/\/$/, "");
  let jwt = await guestJwt(base);
  const headers = () => ({
    Authorization: `Bearer ${jwt}`,
    "X-Api-Token": auth.apiToken,
  });
  let res = await fetch(`${base}${path}`, { headers: headers() });
  if (res.status === 401) {
    jwt = await guestJwt(base);
    res = await fetch(`${base}${path}`, { headers: headers() });
  }
  if (!res.ok) {
    throw new Error(`TxLINE GET ${path} failed: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

/**
 * Pick the scores record used for settlement proof: prefer action=game_finalised
 * (statusId/period 100). Falls back to StatusId 5 (F) if needed.
 */
export function pickFinalScoreRecord(records: any[]): any | null {
  const rows = Array.isArray(records) ? [...records] : [];
  rows.sort((a, b) => Number(a.Seq ?? a.seq ?? 0) - Number(b.Seq ?? b.seq ?? 0));
  const finalised = [...rows]
    .reverse()
    .find((r) => String(r.Action ?? r.action ?? "").toLowerCase() === "game_finalised");
  if (finalised) return finalised;
  const finished = [...rows]
    .reverse()
    .find((r) => Number(r.StatusId ?? r.statusId) === 5 || Number(r.StatusId ?? r.statusId) === 100);
  return finished ?? null;
}

export async function fetchScoresSnapshot(auth: TxlineApiAuth, fixtureId: number): Promise<any[]> {
  const data = await txlineGet(auth, `/api/scores/snapshot/${fixtureId}`);
  return Array.isArray(data) ? data : [data];
}

/** Two-stat proof for P1/P2 total goals (maps to on-chain validate_stat). */
export async function fetchStatValidation(
  auth: TxlineApiAuth,
  fixtureId: number,
  seq: number,
): Promise<any> {
  if (!Number.isInteger(seq) || seq < 1) {
    throw new Error(`Invalid TxLINE seq ${seq} — must be a real observed sequence (>= 1)`);
  }
  const qs = new URLSearchParams({
    fixtureId: String(fixtureId),
    seq: String(seq),
    statKey: String(STAT_KEY_P1_GOALS),
    statKey2: String(STAT_KEY_P2_GOALS),
  });
  return txlineGet(auth, `/api/scores/stat-validation?${qs}`);
}

/** @deprecated alias — prefer fetchStatValidation */
export const fetchStatValidationV2 = fetchStatValidation;

function goalsFromRecordOrValidation(
  record: any,
  validation: any,
  participant1IsHome: boolean,
): { homeGoals: number; awayGoals: number; p1: number; p2: number } {
  let p1 = Number(validation.statToProve?.value);
  let p2 = Number(validation.statToProve2?.value);
  if (!Number.isFinite(p1) || !Number.isFinite(p2)) {
    // TxLINE omits Goals when zero — prefer Score.Total, else Stats keys 1/2.
    p1 = Number(
      record?.Score?.Participant1?.Total?.Goals ?? record?.Stats?.["1"] ?? 0,
    );
    p2 = Number(
      record?.Score?.Participant2?.Total?.Goals ?? record?.Stats?.["2"] ?? 0,
    );
  }
  if (!Number.isFinite(p1) || !Number.isFinite(p2)) {
    throw new Error("Could not read P1/P2 total goals from validation or score record");
  }
  return participant1IsHome
    ? { homeGoals: p1, awayGoals: p2, p1, p2 }
    : { homeGoals: p2, awayGoals: p1, p1, p2 };
}

function outcomePredicate(outcome: Outcome, participant1IsHome: boolean) {
  // validate_stat with subtract: result = P1 - P2
  const wantP1MinusP2 =
    outcome === "draw"
      ? 0
      : outcome === "home"
        ? participant1IsHome
          ? 1
          : -1
        : participant1IsHome
          ? -1
          : 1;

  if (wantP1MinusP2 === 0) {
    return { threshold: 0, comparison: { equalTo: {} } };
  }
  if (wantP1MinusP2 > 0) {
    return { threshold: 0, comparison: { greaterThan: {} } };
  }
  return { threshold: 0, comparison: { lessThan: {} } };
}

/**
 * Fetch Merkle proofs from TxLINE and submit validate_stat against the
 * daily_scores_roots PDA (devnet IDL has no view — real signed tx).
 */
export async function verifyOutcomeWithTxline(opts: {
  auth: TxlineApiAuth;
  rpcUrl: string;
  programId: string;
  wallet: Keypair;
  fixtureId: number;
  seq: number;
  outcome: Outcome;
  participant1IsHome?: boolean;
  scoreRecord?: any;
}): Promise<TxlineValidationResult> {
  const participant1IsHome = opts.participant1IsHome ?? true;
  const validation = await fetchStatValidation(opts.auth, opts.fixtureId, opts.seq);
  const { homeGoals, awayGoals, p1, p2 } = goalsFromRecordOrValidation(
    opts.scoreRecord,
    validation,
    participant1IsHome,
  );

  const implied: Outcome =
    homeGoals > awayGoals ? "home" : homeGoals < awayGoals ? "away" : "draw";
  if (implied !== opts.outcome) {
    throw new Error(
      `TxLINE goals ${homeGoals}-${awayGoals} imply ${implied}, but agent tried to settle ${opts.outcome}`,
    );
  }

  const targetTs = Number(
    validation.summary?.updateStats?.minTimestamp ?? validation.ts ?? validation.Ts,
  );
  if (!Number.isSafeInteger(targetTs) || targetTs < 0) {
    throw new Error("Invalid validation timestamp");
  }
  const epochDay = Math.floor(targetTs / 86_400_000);
  if (epochDay > 0xffff) throw new Error("epoch day out of u16 range");

  const programId = new PublicKey(opts.programId);
  const [dailyScoresPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("daily_scores_roots"), new BN(epochDay).toArrayLike(Buffer, "le", 2)],
    programId,
  );

  const connection = new Connection(opts.rpcUrl, "confirmed");
  const provider = new anchor.AnchorProvider(connection, new anchor.Wallet(opts.wallet), {
    commitment: "confirmed",
  });
  const idl = await anchor.Program.fetchIdl(programId, provider);
  if (!idl) throw new Error("Could not fetch TxLINE IDL from chain");
  const program = new anchor.Program(idl, provider);

  const fixtureSummary = {
    fixtureId: new BN(validation.summary.fixtureId),
    updateStats: {
      updateCount: validation.summary.updateStats.updateCount,
      minTimestamp: new BN(validation.summary.updateStats.minTimestamp),
      maxTimestamp: new BN(validation.summary.updateStats.maxTimestamp),
    },
    eventsSubTreeRoot: toBytes32(
      validation.summary.eventStatsSubTreeRoot ?? validation.summary.eventsSubTreeRoot,
    ),
  };
  const fixtureProof = toProofNodes(validation.subTreeProof);
  const mainTreeProof = toProofNodes(validation.mainTreeProof);

  const stat1 = {
    statToProve: validation.statToProve,
    eventStatRoot: toBytes32(validation.eventStatRoot),
    statProof: toProofNodes(validation.statProof),
  };
  const stat2 = {
    statToProve: validation.statToProve2,
    eventStatRoot: toBytes32(validation.eventStatRoot),
    statProof: toProofNodes(validation.statProof2),
  };

  const computeBudgetIx = ComputeBudgetProgram.setComputeUnitLimit({ units: 1_400_000 });
  const methods = program.methods as any;

  async function runValidate(
    predicate: unknown,
    primaryStat: unknown,
    second: unknown,
    op: unknown,
  ): Promise<string> {
    const builder = methods
      .validateStat(
        new BN(targetTs),
        fixtureSummary,
        fixtureProof,
        mainTreeProof,
        predicate,
        primaryStat,
        second,
        op,
      )
      .accounts({ dailyScoresMerkleRoots: dailyScoresPda })
      .preInstructions([computeBudgetIx]);

    // Devnet IDL does not support .view() — simulate, then land a real tx.
    const sim = await builder.simulate();
    if (sim?.err) {
      throw new Error(`validate_stat simulation err: ${JSON.stringify(sim.err)}`);
    }
    return builder.rpc();
  }

  let onChainViewPassed = false;
  let validationTxSignature: string | undefined;
  let lastErr: unknown;
  try {
    validationTxSignature = await runValidate(
      outcomePredicate(opts.outcome, participant1IsHome),
      stat1,
      stat2,
      { subtract: {} },
    );
    onChainViewPassed = true;
  } catch (err) {
    lastErr = err;
    try {
      // Fallback: prove each side's total goals independently.
      await runValidate(
        { threshold: p1, comparison: { equalTo: {} } },
        stat1,
        null,
        null,
      );
      validationTxSignature = await runValidate(
        { threshold: p2, comparison: { equalTo: {} } },
        stat2,
        null,
        null,
      );
      onChainViewPassed = true;
    } catch (err2) {
      throw new Error(
        `TxLINE validate_stat failed: ${err2 instanceof Error ? err2.message : String(err2)}` +
          ` (primary: ${lastErr instanceof Error ? lastErr.message : String(lastErr)})`,
      );
    }
  }

  if (!onChainViewPassed) {
    throw new Error("TxLINE validate_stat returned false against on-chain Merkle roots");
  }

  return {
    verified: true,
    method: "validateStat",
    fixtureId: opts.fixtureId,
    seq: opts.seq,
    statKeys: [STAT_KEY_P1_GOALS, STAT_KEY_P2_GOALS],
    homeGoals,
    awayGoals,
    participant1IsHome,
    targetTs,
    dailyScoresPda: dailyScoresPda.toBase58(),
    programId: opts.programId,
    onChainViewPassed,
    validationTxSignature,
    validationExplorerUrl: validationTxSignature
      ? `https://explorer.solana.com/tx/${validationTxSignature}?cluster=devnet`
      : undefined,
  };
}

/**
 * End-to-end: load finalised score for fixture → validate_stat → result.
 */
export async function validateFinalOutcome(opts: {
  auth: TxlineApiAuth;
  rpcUrl: string;
  programId: string;
  wallet: Keypair;
  fixtureId: number;
  outcome: Outcome;
  preferredSeq?: number;
}): Promise<TxlineValidationResult> {
  const snapshot = await fetchScoresSnapshot(opts.auth, opts.fixtureId);
  let record =
    opts.preferredSeq != null
      ? snapshot.find((r) => Number(r.Seq ?? r.seq) === opts.preferredSeq)
      : null;
  if (!record) record = pickFinalScoreRecord(snapshot);
  if (!record) {
    throw new Error(
      `No game_finalised (or finished) scores record for fixture ${opts.fixtureId}`,
    );
  }
  const seq = Number(record.Seq ?? record.seq);
  const participant1IsHome = Boolean(
    record.Participant1IsHome ?? record.participant1IsHome ?? true,
  );
  return verifyOutcomeWithTxline({
    ...opts,
    seq,
    participant1IsHome,
    scoreRecord: record,
  });
}
