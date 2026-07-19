import type { VercelRequest, VercelResponse } from "@vercel/node";

/** Fallback when Vercel Root Directory is `apps/web`. */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
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

    const bs58Mod = await import("bs58");
    const bs58 = (bs58Mod as { default: { decode: (s: string) => Uint8Array; encode: (b: Uint8Array) => string } }).default;
    const bytes = bs58.decode(secret);
    if (bytes.length < 64) {
      return res.status(200).json({
        connected: false,
        address: null,
        label: "Invalid agent key length",
      });
    }

    const address = bs58.encode(bytes.slice(32, 64));
    return res.status(200).json({
      connected: true,
      address,
      short: `${address.slice(0, 4)}…${address.slice(-4)}`,
      cluster: "devnet",
      label: "Agent wallet",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("api/wallet failed", message);
    return res.status(200).json({
      connected: false,
      address: null,
      label: `Wallet error: ${message}`,
    });
  }
}
