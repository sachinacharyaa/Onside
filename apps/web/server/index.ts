import { createServer } from "node:http";
import { handleApiRequest } from "./api-app.js";

const PORT = Number(process.env.API_PORT ?? 3001);

const server = createServer((req, res) => handleApiRequest(req, res));

server.listen(PORT, () => {
  console.log(`Onside API  → http://127.0.0.1:${PORT}`);
  console.log(`  GET /api/stream?match=txline-18257739`);
  console.log(`  GET /api/wallet`);
  console.log(`  GET /api/settlement/latest`);
});
