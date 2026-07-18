import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { rulesConfig } from "@onside/signal-engine";

export type AgentConfig = {
  useReplayMode: boolean;
  replayIntervalMs: number;
  replayFile?: string;
  settleThreshold: number;
  solanaRpcUrl: string;
  walletSecretKey?: string;
  programId?: string;
  txlineApiUrl?: string;
  txlineApiToken?: string;
  txlineFixtureId?: number;
};

/** Minimal .env loader (repo root), no dependency. Real env vars win. */
function loadDotEnv(): void {
  const here = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    join(here, "../../../.env"), // repo root from packages/agent-runtime/src
    join(process.cwd(), ".env"),
    join(process.cwd(), "../../.env"),
  ];
  const envPath = candidates.find((p) => existsSync(p));
  if (!envPath) return;
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*(#.*)?$/);
    if (!match) continue;
    const [, key, value] = match;
    if (process.env[key] === undefined && value !== "") process.env[key] = value;
  }
}

export function loadConfig(): AgentConfig {
  loadDotEnv();
  return {
    useReplayMode: (process.env.USE_REPLAY_MODE ?? "true").toLowerCase() !== "false",
    replayIntervalMs: Number(process.env.REPLAY_INTERVAL_MS ?? 1500),
    replayFile: process.env.REPLAY_FILE || undefined,
    settleThreshold: Number(
      process.env.CONFIDENCE_SETTLE_THRESHOLD ?? rulesConfig.decision.settleThreshold,
    ),
    solanaRpcUrl: process.env.SOLANA_RPC_URL ?? "https://api.devnet.solana.com",
    walletSecretKey: process.env.AGENT_WALLET_SECRET_KEY || undefined,
    programId: process.env.ANCHOR_PROGRAM_ID || undefined,
    txlineApiUrl: process.env.TXLINE_API_URL || undefined,
    txlineApiToken: process.env.TXLINE_API_TOKEN || undefined,
    txlineFixtureId: process.env.TXLINE_FIXTURE_ID
      ? Number(process.env.TXLINE_FIXTURE_ID)
      : undefined,
  };
}
