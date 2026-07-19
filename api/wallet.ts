import type { VercelRequest, VercelResponse } from "@vercel/node";
import { handleWallet, sendOptions } from "../apps/web/server/light-api.js";

/**
 * Lightweight wallet status — must NOT import agent/replay packages
 * or Vercel cold-starts crash with FUNCTION_INVOCATION_FAILED.
 */
export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "OPTIONS") return sendOptions(res);
  return handleWallet(req, res);
}
