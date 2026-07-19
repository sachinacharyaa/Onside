import type { VercelRequest, VercelResponse } from "@vercel/node";
import { handleLatestSettlement, sendOptions } from "../../apps/web/server/light-api.js";

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "OPTIONS") return sendOptions(res);
  return handleLatestSettlement(req, res);
}
