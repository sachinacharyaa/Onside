import type { VercelRequest, VercelResponse } from "@vercel/node";

export const config = {
  maxDuration: 300,
};

/**
 * SSE agent stream. Dynamic-import the agent stack; surface load errors as SSE.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const { handleStream } = await import("../apps/web/server/api-app.js");
    return handleStream(req, res);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("api/stream failed to load", message);
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.statusCode = 200;
    res.write(`data: ${JSON.stringify({ kind: "agent-error", message })}\n\n`);
    res.write(`data: ${JSON.stringify({ kind: "end" })}\n\n`);
    res.end();
  }
}
