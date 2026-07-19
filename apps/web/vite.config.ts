import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const root = path.resolve(__dirname);
const packages = path.resolve(root, "../../packages");

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(root, "src"),
      "@onside/agent-runtime": path.resolve(packages, "agent-runtime/src/index.ts"),
      "@onside/ingestion": path.resolve(packages, "ingestion/src/index.ts"),
      "@onside/narration-engine": path.resolve(packages, "narration-engine/src/index.ts"),
      "@onside/settlement": path.resolve(packages, "settlement/src/settler.ts"),
      "@onside/signal-engine": path.resolve(packages, "signal-engine/src/index.ts"),
    },
    // Workspace packages import `./x.js` while sources are `x.ts`.
    extensionAlias: {
      ".js": [".ts", ".tsx", ".js"],
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:3001",
        changeOrigin: true,
      },
    },
  },
  optimizeDeps: {
    exclude: [
      "@onside/agent-runtime",
      "@onside/ingestion",
      "@onside/narration-engine",
      "@onside/settlement",
      "@onside/signal-engine",
    ],
  },
});
