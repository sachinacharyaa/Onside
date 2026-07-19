import type { VercelRequest, VercelResponse } from "@vercel/node";

export const config = {
  maxDuration: 300,
};

/**
 * SSE agent stream. Uses Vercel res.write / res.end (Node-compatible).
 * Dynamic-import the heavy agent stack so /api/wallet stays lean.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { handleStream } = await import("../apps/web/server/api-app.js");
  return handleStream(req, res);
}
