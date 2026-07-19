import type { VercelRequest, VercelResponse } from "@vercel/node";
import { handleStream } from "../apps/web/server/api-app.js";

export const config = {
  maxDuration: 300,
};

/** SSE replay / live agent stream — needs a long-lived function. */
export default function handler(req: VercelRequest, res: VercelResponse) {
  return handleStream(req, res);
}
