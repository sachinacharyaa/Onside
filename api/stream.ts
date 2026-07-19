import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createRequire } from "node:module";
import { join } from "node:path";

export const config = {
  maxDuration: 300,
};

/**
 * SSE agent stream — loads a pre-bundled CJS build (see scripts/bundle-api.mjs)
 * so workspace TypeScript packages resolve on Vercel.
 */
export default function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const require = createRequire(join(process.cwd(), "api/stream.ts"));
    const { handleStream } = require("./stream-bundle.cjs") as {
      handleStream: (req: VercelRequest, res: VercelResponse) => void;
    };
    return handleStream(req, res);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("api/stream failed to load bundle", message);
    try {
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache, no-transform");
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.statusCode = 200;
      res.write(`data: ${JSON.stringify({ kind: "agent-error", message })}\n\n`);
      res.write(`data: ${JSON.stringify({ kind: "end" })}\n\n`);
      res.end();
    } catch {
      // ignore secondary failures
    }
  }
}
