import type { IncomingMessage, ServerResponse } from "node:http";
import { createAgent, loadConfig, type Decision } from "@onside/agent-runtime";
import { getReplayById, listReplays, type MatchEvent } from "@onside/ingestion";
import type { NarrationLine } from "@onside/narration-engine";
import type { SettlementProof } from "@onside/settlement";
import {
  handleLatestSettlement,
  handleWallet,
  persistSettlement,
  sendJson,
  sendOptions,
} from "./light-api.js";

export { handleLatestSettlement, handleWallet, persistSettlement };

/**
 * SSE replay / live agent stream. Heavy imports — only use from /api/stream.
 */
export function handleStream(req: IncomingMessage, res: ServerResponse) {
  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
  const config = loadConfig();
  const matchParam = url.searchParams.get("match");
  const selected = matchParam ? getReplayById(matchParam) : undefined;
  if (selected) {
    config.replayFile = selected.file;
    config.useReplayMode = true;
  }
  const matchId = selected?.id ?? (config.useReplayMode ? "txline-18257739" : "live");
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

  // Batched per match event so Decision Log + Market Pulse update together.
  // Do not also forward raw event/narration/decision — that would double-paint.
  agent.on(
    "tick",
    ({
      event,
      lines,
      decisions,
    }: {
      event: MatchEvent;
      lines: NarrationLine[];
      decisions: Decision[];
    }) =>
      send({
        kind: "tick",
        event,
        lines,
        decisions: decisions.map((d) => ({ signalId: d.signal.id, action: d.action })),
      }),
  );
  agent.on("settlement:line", (line: NarrationLine) => send({ kind: "narration", line }));
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

/** Shared router for local Node server. */
export function handleApiRequest(req: IncomingMessage, res: ServerResponse): void {
  const path = req.url?.split("?")[0] ?? "/";

  if (req.method === "OPTIONS") {
    return sendOptions(res);
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
