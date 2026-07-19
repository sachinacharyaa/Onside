import { loadDotEnv, txlineNetwork } from "./env.js";

/** Small authenticated TxLINE API helper for the setup/recorder scripts. */
export async function txlineApi() {
  loadDotEnv();
  const net = txlineNetwork();
  const apiOrigin = process.env.TXLINE_API_URL ?? net.apiOrigin;
  const apiToken = process.env.TXLINE_API_TOKEN;
  if (!apiToken) {
    throw new Error("TXLINE_API_TOKEN missing in .env — run `npm run txline:subscribe` first.");
  }

  const authRes = await fetch(`${apiOrigin}/auth/guest/start`, { method: "POST" });
  if (!authRes.ok) throw new Error(`guest auth failed: ${authRes.status}`);
  const { token: jwt } = (await authRes.json()) as { token: string };

  return {
    apiOrigin,
    async get(path: string): Promise<any> {
      const res = await fetch(`${apiOrigin}${path}`, {
        headers: { Authorization: `Bearer ${jwt}`, "X-Api-Token": apiToken },
      });
      if (!res.ok) throw new Error(`GET ${path} failed: ${res.status} ${await res.text()}`);
      return res.json();
    },
  };
}
