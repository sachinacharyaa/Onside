import type { VercelRequest, VercelResponse } from "@vercel/node";
import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";

/**
 * Fallback when Vercel Root Directory is set to `apps/web`.
 * Prefer repo-root `/api/wallet.ts` with Root Directory blank.
 */
export default function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  const secret = process.env.AGENT_WALLET_SECRET_KEY?.trim();
  if (!secret) {
    return res.status(200).json({
      connected: false,
      address: null,
      label: "Agent wallet not configured",
    });
  }

  try {
    const keypair = Keypair.fromSecretKey(bs58.decode(secret));
    const address = keypair.publicKey.toBase58();
    return res.status(200).json({
      connected: true,
      address,
      short: `${address.slice(0, 4)}…${address.slice(-4)}`,
      cluster: "devnet",
      label: "Agent wallet",
    });
  } catch {
    return res.status(200).json({
      connected: false,
      address: null,
      label: "Invalid agent key",
    });
  }
}
