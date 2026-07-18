# Onside — Settling Agent

Autonomous, rule-based trading agent for live World Cup markets (Track 3: Trading Tools and Agents).

The agent watches a single live football match, makes **deterministic** (no ML, no LLM) trading decisions from explicit, inspectable rules, narrates every decision in plain language as it happens, and settles its own market on Solana devnet using match data as proof — zero human input during operation.

> Every other agent is a black box that trades. Ours shows its work — every action traces to an explicit rule and real match data, and it proves its own outcome on-chain instead of asking anyone to trust it.

## Quick start

```bash
npm install
cp .env.example .env        # defaults work out of the box (replay + simulated settlement)

# Phase 1 milestone — full pipeline headless in the console
npm run demo:headless

# Phase 2+ — live feed UI at http://localhost:3000
npm run dev
```

Open http://localhost:3000 — the match replays automatically: odds chart updates per event, the narration feed streams one line per triggered rule, and the settlement card flips from PENDING to SETTLED at full time. The "Replay this match" button restarts the run.

## Architecture

```
TxLINE feed / replay ─▶ Signal Engine ─▶ Narration Engine ─▶ Live Feed UI (SSE)
      (ingestion)        (rules, no ML)   (templates, no ML)
                              │
                              ▼
                       Decision Layer ─▶ On-chain Settler (Solana devnet)
```

| Package | Role |
| --- | --- |
| `packages/ingestion` | `ReplayClient` + `TxlineClient` (real TxLINE/txodds SSE feed) behind one `MatchEventSource` interface — live vs. replay is a config flip |
| `packages/txline-setup` | TxLINE World Cup free-tier onboarding: on-chain `subscribe`, API token activation, fixture listing, historical match recorder |
| `packages/signal-engine` | 3 deterministic rules (`ODDS_SWING`, `SCORE_CHANGE`, `TIME_DECAY_MISMATCH`); **all thresholds live in `rules.config.ts`** |
| `packages/narration-engine` | Pure template interpolation; **all sentences live in `templates.ts`** |
| `packages/agent-runtime` | Orchestrates ingest → evaluate → narrate → decide → settle; logs every decision |
| `packages/settlement` | Signs & submits the settlement tx; Anchor program source in `anchor-program/` |
| `apps/web` | Next.js live feed: odds chart, narration feed, rules panel, settlement card |

## On-chain settlement modes

The settler degrades gracefully so a demo can never dead-end:

1. **anchor** — `AGENT_WALLET_SECRET_KEY` + `ANCHOR_PROGRAM_ID` set: calls `settle_market(matchId, outcome, proofHash)` on the deployed Anchor program (PDA per match, settle-once enforced).
2. **memo** — wallet set, no program id: submits a Memo transaction carrying the proof JSON. Still a real, clickable devnet Explorer link.
3. **simulated** — no wallet: deterministic fake signature, UI still completes.

Setup:

```bash
npm run wallet:generate                              # prints keypair for .env, tries a faucet airdrop
npx tsx packages/settlement/src/check-balance.ts     # verify/refund the wallet (faucet.solana.com if rate-limited)
```

To deploy the Anchor program see `packages/settlement/anchor-program/README.md`.

## Real TxLINE data (Phase 4)

Onside runs on [TxLINE by txodds](https://txline.txodds.com) — the World Cup free tier is free (no TxL), but the on-chain `subscribe` transaction needs devnet SOL on the agent wallet.

```bash
npm run txline:subscribe            # subscribe on-chain + activate API token (auto-writes .env)
npm run txline:fixtures             # list covered fixtures, pick an id

# go live:            USE_REPLAY_MODE=false + TXLINE_FIXTURE_ID=<id> in .env
# or record a real finished match (6h–2wk old) into the replay path:
npm run txline:record -- <fixtureId>   # then REPLAY_FILE=txline-<fixtureId>.json
```

The live client authenticates (guest JWT + activated API token), consumes the `/api/scores/stream` and `/api/odds/stream` SSE feeds, and normalizes TxLINE records (soccer game phases, `game_finalised`, StablePrice 1X2 lines) into the same `MatchEvent` schema the replay uses — downstream code is untouched. Details in `packages/txline-setup/README.md`.

## Configuration (`.env`)

| Variable | Default | Purpose |
| --- | --- | --- |
| `USE_REPLAY_MODE` | `true` | `false` (+ token & fixture id) switches to the live TxLINE adapter |
| `TXLINE_NETWORK` | `devnet` | Selects the TxLINE host/program set (`devnet` / `mainnet`) |
| `TXLINE_API_URL` | devnet host | TxLINE API origin (written by `txline:subscribe`) |
| `TXLINE_API_TOKEN` | empty | Activated API token (written by `txline:subscribe`) |
| `TXLINE_FIXTURE_ID` | empty | Fixture to follow live (from `txline:fixtures`) |
| `REPLAY_FILE` | empty | Alternate replay file, e.g. `txline-<id>.json` from `txline:record` |
| `REPLAY_INTERVAL_MS` | `1500` | Demo pacing between replayed events |
| `CONFIDENCE_SETTLE_THRESHOLD` | `80` | Signals at/above this confidence trigger actions |
| `SOLANA_RPC_URL` | devnet | RPC endpoint |
| `AGENT_WALLET_SECRET_KEY` | empty | base58 devnet keypair; empty = simulated settlement |
| `ANCHOR_PROGRAM_ID` | empty | deployed program id; empty = Memo-proof fallback |

## The rules (auditable before it trades)

| Rule | Trigger | Confidence |
| --- | --- | --- |
| `ODDS_SWING` | home implied probability moves ≥ 4pts between ticks | `min(100, |Δ| × 8)` |
| `SCORE_CHANGE` | goal / red card / full-time | goal 90 · red card 70 · FT 100 |
| `TIME_DECAY_MISMATCH` | leader's price diverges ≥ 8pts from expected decay curve | `min(100, deviation × 10)` |

Deltas are implied-probability percentage points (`100 / decimalOdds`). Change them in one place: `packages/signal-engine/src/rules.config.ts`.

## Demo script (2 minutes)

1. **0:00** — "This agent watches a live match, decides autonomously using explicit rules — no AI black box — and settles its own market on-chain."
2. **0:15** — Point at the Rules panel: exact live thresholds, auditable before it trades.
3. **0:45** — A goal fires: narration line + confidence badge appear, chart jumps. Narrate it as it narrates itself.
4. **1:30** — Full time: settlement card flips to SETTLED, click the Explorer link.
5. **1:50** — "Every decision traces to a rule and real match data — nothing hidden, nothing hallucinated."
