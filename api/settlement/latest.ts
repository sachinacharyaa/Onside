import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { VercelRequest, VercelResponse } from "@vercel/node";

const DATA_DIR = process.env.VERCEL
  ? join("/tmp", "onside")
  : existsSync(join(process.cwd(), "apps/web"))
    ? join(process.cwd(), "apps/web/.data")
    : join(process.cwd(), ".data");
const LAST_SETTLEMENT_PATH = join(DATA_DIR, "last-settlement.json");

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (existsSync(LAST_SETTLEMENT_PATH)) {
    try {
      const proof = JSON.parse(readFileSync(LAST_SETTLEMENT_PATH, "utf8"));
      return res.status(200).json({ proof });
    } catch {
      return res.status(200).json({ proof: null, error: "Corrupt settlement cache" });
    }
  }

  return res.status(200).json({ proof: null });
}
