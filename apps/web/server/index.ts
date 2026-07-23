import { existsSync, readFileSync } from "node:fs";
import { createServer } from "node:http";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { handleApiRequest } from "./api-app.js";

/** Load repo-root .env so /api/wallet sees AGENT_WALLET_SECRET_KEY without a prior stream. */
function loadDotEnv(): void {
  const here = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    join(here, "../../../.env"), // repo root from apps/web/server
    join(process.cwd(), ".env"),
    join(process.cwd(), "../../.env"),
  ];
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

loadDotEnv();

const PORT = Number(process.env.API_PORT ?? 3001);

const server = createServer((req, res) => handleApiRequest(req, res));

server.listen(PORT, () => {
  const walletReady = Boolean(process.env.AGENT_WALLET_SECRET_KEY?.trim());
  console.log(`Onside API  → http://127.0.0.1:${PORT}`);
  console.log(`  GET /api/stream?match=txline-18257739`);
  console.log(`  GET /api/wallet`);
  console.log(`  GET /api/settlement/latest`);
  console.log(
    walletReady
      ? "  Agent wallet: configured"
      : "  Agent wallet: OFFLINE (set AGENT_WALLET_SECRET_KEY in repo-root .env)",
  );
});
