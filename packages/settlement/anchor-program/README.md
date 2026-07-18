# Onside settlement program (Anchor, devnet)

Minimal Anchor program with a single instruction:

```
settle_market(match_id: String, outcome: u8, proof_hash: [u8; 32])
```

It creates a PDA (`["settlement", match_id]`) storing the match id, final
outcome (0 = home, 1 = away, 2 = draw), a sha256 hash of the triggering
signal payload, the unix timestamp, and the settling authority. `init`
guarantees a market can only be settled once.

## Deploy (requires Rust + Solana CLI + Anchor installed)

```bash
cd packages/settlement/anchor-program
anchor keys sync         # generates a real program id and patches lib.rs/Anchor.toml
anchor build
anchor deploy --provider.cluster devnet
```

Then put the printed program id into `.env` as `ANCHOR_PROGRAM_ID`.

> No Anchor toolchain? The agent falls back to a Memo-program proof
> transaction on devnet — still a real, clickable Explorer link. Leave
> `ANCHOR_PROGRAM_ID` empty in `.env`.
