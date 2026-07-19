import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";
import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";

/** Lightweight JSON helpers — no agent/replay imports (keeps Vercel cold starts small). */

export function sendJson(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  });
  res.end(JSON.stringify(body));
}

export function sendOptions(res: ServerResponse) {
  res.writeHead(204, {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  res.end();
}

const DATA_DIR = process.env.VERCEL
  ? join("/tmp", "onside")
  : existsSync(join(process.cwd(), "apps/web"))
    ? join(process.cwd(), "apps/web/.data")
    : join(process.cwd(), ".data");
const LAST_SETTLEMENT_PATH = join(DATA_DIR, "last-settlement.json");

let memorySettlement: unknown = null;

export function persistSettlement(proof: unknown): void {
  memorySettlement = proof;
  try {
    mkdirSync(DATA_DIR, { recursive: true });
    writeFileSync(LAST_SETTLEMENT_PATH, JSON.stringify(proof, null, 2));
  } catch (err) {
    console.warn("Could not persist last settlement:", err);
  }
}

export function handleWallet(_req: IncomingMessage, res: ServerResponse) {
  const secret = process.env.AGENT_WALLET_SECRET_KEY?.trim();
  if (!secret) {
    return sendJson(res, 200, {
      connected: false,
      address: null,
      label: "Agent wallet not configured",
    });
  }
  try {
    const keypair = Keypair.fromSecretKey(bs58.decode(secret));
    const address = keypair.publicKey.toBase58();
    return sendJson(res, 200, {
      connected: true,
      address,
      short: `${address.slice(0, 4)}…${address.slice(-4)}`,
      cluster: "devnet",
      label: "Agent wallet",
    });
  } catch {
    return sendJson(res, 200, {
      connected: false,
      address: null,
      label: "Invalid agent key",
    });
  }
}

export function handleLatestSettlement(_req: IncomingMessage, res: ServerResponse) {
  if (existsSync(LAST_SETTLEMENT_PATH)) {
    try {
      const proof = JSON.parse(readFileSync(LAST_SETTLEMENT_PATH, "utf8"));
      return sendJson(res, 200, { proof });
    } catch {
      return sendJson(res, 200, { proof: null, error: "Corrupt settlement cache" });
    }
  }
  return sendJson(res, 200, { proof: memorySettlement });
}
