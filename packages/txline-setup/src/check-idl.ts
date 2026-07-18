import * as anchor from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { txlineNetwork } from "./env.js";

/** Sanity check: confirm the TxLINE IDL is fetchable from chain and has `subscribe`. */
async function main() {
  const net = txlineNetwork();
  const connection = new Connection(net.rpcUrl, "confirmed");
  const provider = new anchor.AnchorProvider(connection, new anchor.Wallet(Keypair.generate()), {
    commitment: "confirmed",
  });
  const idl = await anchor.Program.fetchIdl(new PublicKey(net.programId), provider);
  if (!idl) {
    console.error("No IDL found on chain for", net.programId);
    process.exit(1);
  }
  const instructions = (idl as { instructions?: { name: string }[] }).instructions ?? [];
  console.log(`IDL fetched: ${idl.metadata?.name ?? "?"} — ${instructions.length} instructions`);
  const subscribe = instructions.find((i) => i.name === "subscribe");
  console.log(subscribe ? "`subscribe` instruction present ✔" : "`subscribe` NOT found ✘");
}

main().catch((err) => {
  console.error("Failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
