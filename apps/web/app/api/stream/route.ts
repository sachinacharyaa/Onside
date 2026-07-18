import { createAgent, loadConfig } from "@onside/agent-runtime";
import type { MatchEvent } from "@onside/ingestion";
import type { NarrationLine } from "@onside/narration-engine";
import type { SettlementProof } from "@onside/settlement";
import type { StreamMessage } from "@/lib/stream-types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * SSE endpoint feeding the live feed UI. Each connection runs its own
 * agent over the configured source (replay by default), so reconnecting
 * the browser = "replay this match" reset button.
 */
export async function GET(request: Request): Promise<Response> {
  const config = loadConfig();
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

      send({
        kind: "meta",
        meta: agent.meta,
        settleThreshold: config.settleThreshold,
        mode: config.useReplayMode ? "replay" : "live",
      });

      agent.on("event", (event: MatchEvent) => send({ kind: "event", event }));
      agent.on("narration", (line: NarrationLine) => send({ kind: "narration", line }));
      agent.on("settlement:pending", ({ outcome }: { outcome: string }) =>
        send({ kind: "settlement:pending", outcome }),
      );
      agent.on("settlement", (proof: SettlementProof) => {
        send({ kind: "settlement", proof });
        send({ kind: "end" });
        closed = true;
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      });
      agent.on("error", (err: Error) => send({ kind: "agent-error", message: err.message }));

      request.signal.addEventListener("abort", () => {
        closed = true;
        agent.stop();
        try {
          controller.close();
        } catch {
          /* already closed */
        }
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
