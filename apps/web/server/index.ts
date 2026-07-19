import { createServer } from "node:http";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createAgent, loadConfig, type Decision } from "@onside/agent-runtime";
import { getReplayById, listReplays, type MatchEvent } from "@onside/ingestion";
import type { NarrationLine } from "@onside/narration-engine";
import type { SettlementProof } from "@onside/settlement";
import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.API_PORT ?? 3001);
const isProd = process.env.NODE_ENV === "production";

function loadDotEnv(): void {
  const candidates = [
    join(__dirname, "../../../.env"), // repo root from apps/web/server
    join(__dirname, "../../.env"),
    join(process.cwd(), ".env"),
    join(process.cwd(), "../../.env"),
  ];
  for (const envPath of candidates) {
    if (!existsSync(envPath)) continue;
    for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*(#.*)?$/);
      if (!match) continue;
      const [, key, value] = match;
      if (process.env[key] === undefined && value !== "") process.env[key] = value;
    }
    break;
  }
}

loadDotEnv();

function sendJson(res: import("node:http").ServerResponse, status: number, body: unknown) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  });
  res.end(JSON.stringify(body));
}

function handleWallet(_req: import("node:http").IncomingMessage, res: import("node:http").ServerResponse) {
  const secret = process.env.AGENT_WALLET_SECRET_KEY;
  if (!secret) {
    return sendJson(res, 200, { connected: false, address: null, label: "Agent wallet not configured" });
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
    return sendJson(res, 500, { connected: false, address: null, label: "Invalid agent key" });
  }
}

function handleStream(req: import("node:http").IncomingMessage, res: import("node:http").ServerResponse) {
  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
  const config = loadConfig();
  const matchParam = url.searchParams.get("match");
  const selected = matchParam ? getReplayById(matchParam) : undefined;
  if (selected) {
    config.replayFile = selected.file;
    config.useReplayMode = true;
  }
  const matchId = selected?.id ?? (config.useReplayMode ? "bra-fra" : "live");
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
    send({ kind: "settlement", proof });
    send({ kind: "end" });
    close();
  });
  agent.on("error", (err: Error) => send({ kind: "agent-error", message: err.message }));

  req.on("close", close);
  agent.start();
}

const server = createServer((req, res) => {
  const path = req.url?.split("?")[0] ?? "/";

  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    });
    return res.end();
  }

  if (path === "/api/wallet" && req.method === "GET") return handleWallet(req, res);
  if (path === "/api/stream" && req.method === "GET") return handleStream(req, res);

  if (isProd) {
    // In production, prefer `vite preview` for static + this API separately,
    // or put a reverse proxy in front. Keep API-only here for simplicity.
    return sendJson(res, 404, { error: "Not found" });
  }

  sendJson(res, 404, { error: "Not found" });
});

server.listen(PORT, () => {
  console.log(`Onside API  → http://127.0.0.1:${PORT}`);
  console.log(`  GET /api/stream?match=bra-fra`);
  console.log(`  GET /api/wallet`);
});
