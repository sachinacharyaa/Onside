import type { VercelRequest, VercelResponse } from "@vercel/node";
import { handleLatestSettlement } from "../../apps/web/server/api-app.js";

export default function handler(req: VercelRequest, res: VercelResponse) {
  return handleLatestSettlement(req, res);
}
