# @onside/txline-setup

One-time onboarding + tooling for the TxLINE (txodds) World Cup free tier.

TxLINE reference: [txline.txodds.com docs](https://txline-docs.txodds.com/llms.txt) — World Cup Free Tier, Program Reference (Devnet), Streaming Data.

## Flow (devnet, all from repo root)

```bash
# 0. one wallet drives everything (TxLINE subscribe tx + settlement tx)
npm run wallet:generate            # then fund at https://faucet.solana.com

# 1. subscribe on-chain (free tier, service level 1) + activate the API token
#    writes TXLINE_API_URL and TXLINE_API_TOKEN into .env automatically
npm run txline:subscribe

# 2. pick a covered fixture
npm run txline:fixtures

# 3a. go live: set in .env
#     USE_REPLAY_MODE=false
#     TXLINE_FIXTURE_ID=<id>

# 3b. or record a finished fixture (6h–2wk old) into a replay file —
#     REAL match data through the deterministic replay path (best for judged demos)
npm run txline:record -- <fixtureId>
#     then set REPLAY_FILE=txline-<fixtureId>.json in .env
```

## Notes

- Free tier costs no TxL, but the on-chain `subscribe` transaction needs devnet SOL for fees/rent.
- The devnet program is `6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J`; the IDL is fetched from chain at runtime (no vendored IDL file).
- Everything (RPC, program id, JWT host, activation, API host) must stay on the same network — `TXLINE_NETWORK` switches the whole set.
- Activation signs `${txSig}::${jwt}` (empty league list) with the same wallet that sent the subscribe tx, exactly as the docs specify.
