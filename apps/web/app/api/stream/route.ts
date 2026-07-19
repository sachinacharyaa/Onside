import { createAgent, loadConfig } from "@onside/agent-runtime";
import { getReplayById, listReplays, type MatchEvent } from "@onside/ingestion";
import type { NarrationLine } from "@onside/narration-engine";
import type { SettlementProof } from "@onside/settlement";
import type { StreamMessage } from "@/lib/stream-types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * SSE endpoint feeding the live feed UI. Each connection runs its own
 * agent over the configured source (replay by default), so reconnecting
 * the browser = replaying the match.
 *
 * ?match=<registry id> selects a replay from the match registry.
 */
export async function GET(request: Request): Promise<Response> {
  const config = loadConfig();

  const url = new URL(request.url);
  const matchParam = url.searchParams.get("match");
  const selected = matchParam ? getReplayById(matchParam) : undefined;
  if (selected) {
    config.replayFile = selected.file;
    config.useReplayMode = true;
  }
  const matchId = selected?.id ?? (config.useReplayMode ? "bra-fra" : "live");

  const agent = createAgent(config);
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;
      const send = (msg: StreamMessage) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(msg)}\n\n`));
        } catch {
          closed = true;
        }
      };
      const close = () => {
        closed = true;
        try {
          controller.close();
        } catch {
          /* already closed */
        }
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

      request.signal.addEventListener("abort", () => {
        agent.stop();
        close();
      });

      agent.start();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
