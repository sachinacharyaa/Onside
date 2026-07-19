import * as esbuild from "esbuild";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outfile = join(root, "api/stream-bundle.cjs");

mkdirSync(dirname(outfile), { recursive: true });

await esbuild.build({
  absWorkingDir: root,
  entryPoints: [join(root, "apps/web/server/stream-entry.ts")],
  bundle: true,
  platform: "node",
  target: "node20",
  format: "cjs",
  outfile,
  sourcemap: false,
  logLevel: "info",
  // Bundle workspace TS + JSON replays into one serverless file.
  loader: {
    ".json": "json",
    ".ts": "ts",
  },
  // Keep native-ish optionals external if any; solana/bs58 stay bundled.
  packages: "bundle",
  alias: {
    "@onside/agent-runtime": join(root, "packages/agent-runtime/src/index.ts"),
    "@onside/ingestion": join(root, "packages/ingestion/src/index.ts"),
    "@onside/narration-engine": join(root, "packages/narration-engine/src/index.ts"),
    "@onside/settlement": join(root, "packages/settlement/src/settler.ts"),
    "@onside/signal-engine": join(root, "packages/signal-engine/src/index.ts"),
  },
  resolveExtensions: [".ts", ".tsx", ".js", ".json"],
  // Avoid empty import.meta.url in CJS (dotenv paths are unused on Vercel).
  define: {
    "import.meta.url": JSON.stringify("file:///onside/bundle.js"),
  },
});

console.log("Wrote", outfile);
