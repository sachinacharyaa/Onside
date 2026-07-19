import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";
import { createAgent, loadConfig, type Decision } from "@onside/agent-runtime";
import { getReplayById, listReplays, type MatchEvent } from "@onside/ingestion";
import type { NarrationLine } from "@onside/narration-engine";
import type { SettlementProof } from "@onside/settlement";
import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";

/** Local `.data` or Vercel `/tmp` (ephemeral across cold starts). */
const DATA_DIR = process.env.VERCEL
  ? join("/tmp", "onside")
  : existsSync(join(process.cwd(), "apps/web"))
    ? join(process.cwd(), "apps/web/.data")
    : join(process.cwd(), ".data");
const LAST_SETTLEMENT_PATH = join(DATA_DIR, "last-settlement.json");

/** In-memory fallback when the filesystem is unavailable. */
let memorySettlement: SettlementProof | null = null;

function loadDotEnv(): void {
  if (process.env.VERCEL) return; // Vercel injects env vars
  const candidates = [
    join(process.cwd(), ".env"),
    join(process.cwd(), "../../.env"),
    join(process.cwd(), "apps/web/.env"),
  ];
  for (const envPath of candidates) {
    if (!existsSync(envPath)) continue;
    for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
      if (!match) continue;
      const [, key, raw] = match;
      const value = raw.replace(/\s+#.*$/, "").trim();
      if (process.env[key] === undefined && value !== "") process.env[key] = value;
    }
    break;
  }
}

loadDotEnv();

function sendJson(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  });
  res.end(JSON.stringify(body));
}

function persistSettlement(proof: SettlementProof): void {
  memorySettlement = proof;
  try {
    mkdirSync(DATA_DIR, { recursive: true });
    writeFileSync(LAST_SETTLEMENT_PATH, JSON.stringify(proof, null, 2));
  } catch (err) {
    console.warn("Could not persist last settlement:", err);
  }
}

export function handleWallet(_req: IncomingMessage, res: ServerResponse) {
  const secret = process.env.AGENT_WALLET_SECRET_KEY;
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
    return sendJson(res, 500, {
      connected: false,
      address: null,
      label: "Invalid agent key",
    });
  }
}

export function handleLatestSettlement(_req: IncomingMessage, res: ServerResponse) {
  if (existsSync(LAST_SETTLEMENT_PATH)) {
    try {
      const proof = JSON.parse(readFileSync(LAST_SETTLEMENT_PATH, "utf8")) as SettlementProof;
      return sendJson(res, 200, { proof });
    } catch {
      return sendJson(res, 500, { proof: null, error: "Corrupt settlement cache" });
    }
  }
  return sendJson(res, 200, { proof: memorySettlement });
}

export function handleStream(req: IncomingMessage, res: ServerResponse) {
  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
  const config = loadConfig();
  const matchParam = url.searchParams.get("match");
  const selected = matchParam ? getReplayById(matchParam) : undefined;
  if (selected) {
    config.replayFile = selected.file;
    config.useReplayMode = true;
  }
  const matchId = selected?.id ?? (config.useReplayMode ? "txline-18257865" : "live");
  const agent = createAgent(config);

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "Access-Control-Allow-Origin": "*",
  });

  let closed = false;
  const send = (msg: unknown) => {
    if (closed) return;
    res.write(`data: ${JSON.stringify(msg)}\n\n`);
  };
  const close = () => {
    if (closed) return;
    closed = true;
    agent.stop();
    res.end();
  };

  send({
    kind: "meta",
    meta: agent.meta,
    settleThreshold: config.settleThreshold,
    mode: config.useReplayMode ? "replay" : "live",
    matchId,
    matches: listReplays(),
  });

  agent.on("event", (event: MatchEvent) => send({ kind: "event", event }));
  agent.on("narration", (line: NarrationLine) => send({ kind: "narration", line }));
  agent.on("decision", (decision: Decision) =>
    send({ kind: "decision", signalId: decision.signal.id, action: decision.action }),
  );
  agent.on("settlement:pending", ({ outcome }: { outcome: string }) =>
    send({ kind: "settlement:pending", outcome }),
  );
  agent.on("settlement", (proof: SettlementProof) => {
    persistSettlement(proof);
    send({ kind: "settlement", proof });
    send({ kind: "end" });
    close();
  });
  agent.on("settlement:failed", (payload: { outcome: string; message: string }) => {
    send({ kind: "settlement:failed", ...payload });
    send({ kind: "end" });
    close();
  });
  agent.on("error", (err: Error) => send({ kind: "agent-error", message: err.message }));

  req.on("close", close);
  agent.start();
}

/** Shared router for local Node server and Vercel serverless. */
export function handleApiRequest(req: IncomingMessage, res: ServerResponse): void {
  const path = req.url?.split("?")[0] ?? "/";

  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    });
    res.end();
    return;
  }

  if ((path === "/api/wallet" || path === "/wallet") && req.method === "GET") {
    return handleWallet(req, res);
  }
  if (
    (path === "/api/settlement/latest" || path === "/settlement/latest") &&
    req.method === "GET"
  ) {
    return handleLatestSettlement(req, res);
  }
  if ((path === "/api/stream" || path === "/stream") && req.method === "GET") {
    return handleStream(req, res);
  }

  sendJson(res, 404, { error: "Not found" });
}
