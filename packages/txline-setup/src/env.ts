import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/** Minimal repo-root .env loader (same behaviour as agent-runtime's). */
export function loadDotEnv(): void {
  const here = dirname(fileURLToPath(import.meta.url));
  const candidates = [join(here, "../../../.env"), join(process.cwd(), ".env")];
  const envPath = candidates.find((p) => existsSync(p));
  if (!envPath) return;
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (!match) continue;
    const [, key, raw] = match;
    const value = raw.replace(/\s+#.*$/, "").trim();
    if (process.env[key] === undefined && value !== "") process.env[key] = value;
  }
}

export const TXLINE_DEVNET = {
  rpcUrl: "https://api.devnet.solana.com",
  apiOrigin: "https://txline-dev.txodds.com",
  programId: "6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J",
  txlTokenMint: "4Zao8ocPhmMgq7PdsYWyxvqySMGx7xb9cMftPMkEokRG",
} as const;

export const TXLINE_MAINNET = {
  rpcUrl: "https://api.mainnet-beta.solana.com",
  apiOrigin: "https://txline.txodds.com",
  programId: "9ExbZjAapQww1vfcisDmrngPinHTEfpjYRWMunJgcKaA",
  txlTokenMint: "Zhw9TVKp68a1QrftncMSd6ELXKDtpVMNuMGr1jNwdeL",
} as const;

export function txlineNetwork() {
  loadDotEnv();
  return (process.env.TXLINE_NETWORK ?? "devnet") === "mainnet" ? TXLINE_MAINNET : TXLINE_DEVNET;
}
