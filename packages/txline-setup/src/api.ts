import { loadDotEnv, txlineNetwork } from "./env.js";

/** Parse TxLINE GET bodies that may be JSON or SSE (`text/event-stream`). */
function parseBody(text: string, contentType: string | null): any {
  const ct = contentType ?? "";
  if (ct.includes("text/event-stream") || text.trimStart().startsWith("data:")) {
    const rows: any[] = [];
    for (const block of text.split(/\n\n+/)) {
      for (const line of block.split(/\n/)) {
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;
        try {
          rows.push(JSON.parse(payload));
        } catch {
          /* skip */
        }
      }
    }
    return rows;
  }
  return JSON.parse(text);
}

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

  async function fetchPath(path: string): Promise<{ status: number; ct: string | null; text: string }> {
    const res = await fetch(`${apiOrigin}${path}`, {
      headers: { Authorization: `Bearer ${jwt}`, "X-Api-Token": apiToken },
    });
    const text = await res.text();
    return { status: res.status, ct: res.headers.get("content-type"), text };
  }

  return {
    apiOrigin,
    async get(path: string): Promise<any> {
      const { status, ct, text } = await fetchPath(path);
      if (status < 200 || status >= 300) {
        throw new Error(`GET ${path} failed: ${status} ${text.slice(0, 200)}`);
      }
      return parseBody(text, ct);
    },
    /** Always returns an array of records (JSON array or SSE frames). */
    async getRecords(path: string): Promise<any[]> {
      const data = await this.get(path);
      if (Array.isArray(data)) return data;
      if (data == null) return [];
      return [data];
    },
  };
}
