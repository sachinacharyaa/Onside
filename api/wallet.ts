import type { VercelRequest, VercelResponse } from "@vercel/node";
import { handleWallet } from "../apps/web/server/api-app.js";

export default function handler(req: VercelRequest, res: VercelResponse) {
  return handleWallet(req, res);
}
