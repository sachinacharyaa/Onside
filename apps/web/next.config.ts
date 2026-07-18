import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@onside/agent-runtime",
    "@onside/ingestion",
    "@onside/narration-engine",
    "@onside/settlement",
    "@onside/signal-engine",
  ],
  // Workspace packages use Node16-style ESM imports (`./x.js` -> `x.ts`).
  webpack: (config) => {
    config.resolve.extensionAlias = {
      ".js": [".ts", ".tsx", ".js"],
    };
    return config;
  },
};

export default nextConfig;
