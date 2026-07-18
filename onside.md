# PRD: Onside(Settling Agent)

### Autonomous, rule-based trading agent for live World Cup markets — Track 3: Trading Tools and Agents

---

## 1. Vision

Build an autonomous agent that watches a single live football match via TxLINE's real-time data feed, makes deterministic (non-ML) trading decisions based on explicit, inspectable rules, narrates every decision in plain language as it happens, and settles its own market on-chain using match data as proof — with zero human input during operation.

**One-liner for judges:** _"Every other agent here is a black box that trades. Ours shows its work — every action traces to an explicit rule and real match data, and it proves its own outcome on-chain instead of asking anyone to trust it."_

---

## 2. Goals & Success Criteria

| Goal                      | Success Criteria                                                                                              |
| ------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Live data ingestion       | Agent pulls real (or realistic replayed) TxLINE match data — score, odds, timeline events                     |
| Deterministic decisioning | Every trade/settlement decision maps to an explicit, named rule with a visible confidence score               |
| Live narration            | A human-readable reasoning feed renders in real time, one line per triggered event                            |
| On-chain settlement       | Agent signs and submits a settlement transaction to a minimal testnet contract when a threshold is crossed    |
| Demo-ready                | End-to-end flow (ingest → signal → narrate → settle) runs live in a 2-minute demo without manual intervention |

**Non-goals (explicitly out of scope):**

- No multi-match / multi-market support — one match, one market only
- No LLM/AI calls anywhere in the pipeline — fully deterministic
- No real-money settlement — testnet/devnet only
- No user-facing trading UI for third parties (this is Track 3, not Track 1 — don't build a market platform)
- No order book, no liquidity pool, no multi-outcome market logic

---

## 3. System Architecture

```
┌─────────────────┐      ┌──────────────────┐      ┌────────────────────┐      ┌──────────────────┐
│  TxLINE Feed     │─────▶│  Signal Engine    │─────▶│  Narration Engine   │─────▶│  Live Feed UI     │
│  (ingestion)     │      │  (rules, no ML)   │      │  (templates, no ML) │      │  (frontend)       │
└─────────────────┘      └──────────────────┘      └────────────────────┘      └──────────────────┘
                                    │
                                    ▼
                          ┌──────────────────┐      ┌────────────────────┐
                          │  Decision/Action  │─────▶│  On-chain Settler   │
                          │  Layer             │      │  (testnet contract) │
                          └──────────────────┘      └────────────────────┘
```

**Data flow:** poll/stream → normalize → evaluate rules → emit signal(s) → generate narration line → push to UI feed → if confidence threshold crossed, execute settlement transaction → confirm on-chain → render proof link in UI.

---

## 4. Tech Stack (recommended, solo-buildable)

| Layer                 | Choice                                                       | Why                                                                          |
| --------------------- | ------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| Backend/agent runtime | Node.js (TypeScript)                                         | Single language across backend + chain scripts, fast to iterate              |
| Chain                 | Solana devnet + Anchor                                       | Matches ecosystem competitors are using; testnet is free and fast to confirm |
| Frontend              | Next.js + Tailwind                                           | Fast to build a clean live-feed UI, matches frontend-design conventions      |
| Realtime push         | WebSocket (or simple polling every 3-5s if feed has no push) | Keeps demo simple, no extra infra                                            |
| Data store            | In-memory + optional SQLite                                  | No need for a real DB for a single-match demo                                |
| Deployment            | Local + tunneled (e.g. ngrok) or Vercel for frontend         | Fast to demo live                                                            |

If TxLINE has no free/sandbox access before the hackathon, build a **replay mode**: record or hand-construct a JSON timeline of a real match (scores, odds ticks, events with timestamps) and feed it through the same ingestion interface at accelerated speed. This must be a drop-in replacement — same schema, same code path — so switching to live data is a config flip, not a rewrite.

---

## 5. Data Model

### 5.1 Normalized match event (from ingestion layer)

```ts
type MatchEvent = {
  matchId: string;
  minute: number;
  type: "goal" | "card" | "substitution" | "odds_tick" | "kickoff" | "fulltime";
  team?: "home" | "away";
  odds?: { home: number; draw?: number; away: number };
  scoreHome: number;
  scoreAway: number;
  timestamp: string; // ISO
};
```

### 5.2 Signal (output of rules engine)

```ts
type Signal = {
  id: string;
  triggeredBy: MatchEvent;
  rule: "ODDS_SWING" | "SCORE_CHANGE" | "TIME_DECAY_MISMATCH";
  delta?: number; // e.g. odds point movement
  confidence: number; // 0-100, computed deterministically
  suggestedAction:
    | "OPEN_HOME"
    | "OPEN_AWAY"
    | "HOLD"
    | "SETTLE_HOME"
    | "SETTLE_AWAY";
};
```

### 5.3 Narration line (output of template engine)

```ts
type NarrationLine = {
  text: string; // fully rendered sentence
  signal: Signal;
  createdAt: string;
};
```

### 5.4 Settlement record (on-chain)

```ts
type SettlementProof = {
  matchId: string;
  finalOutcome: "home" | "away" | "draw";
  txSignature: string; // Solana tx hash
  settledAt: string;
  triggeringSignal: Signal;
};
```

---

## 6. Component Specs

### 6.1 Ingestion Service

- Input: TxLINE normalized JSON feed (or replay file matching the same shape).
- Output: stream of `MatchEvent` objects in chronological order.
- Must expose a single interface (`getNextEvent()` / event emitter) so live vs. replay is interchangeable.
- Handle reconnect/backoff if using a live socket; replay mode never fails.

### 6.2 Signal Engine (deterministic — no ML, no LLM)

Explicit rules, each independently testable:

| Rule                  | Trigger condition                                              | Confidence formula (example, tune during build) |
| --------------------- | -------------------------------------------------------------- | ----------------------------------------------- |
| `ODDS_SWING`          | Odds move ≥ X points within Y seconds                          | `min(100, delta * 8)`                           |
| `SCORE_CHANGE`        | Goal/red card event                                            | flat `90` for goal, `70` for red card           |
| `TIME_DECAY_MISMATCH` | Odds diverge from expected decay curve given minutes remaining | `min(100, deviation * 10)`                      |

Rules run on every incoming event; multiple signals can fire per event. Keep thresholds in a single config file (`rules.config.ts`) so they're visibly tunable and auditable — this transparency is part of the pitch.

### 6.3 Narration Engine (template-based — no ML, no LLM)

5-6 templates keyed by `rule` + `type`, e.g.:

```
GOAL:        "{team} scores at {minute}' → odds moved {delta}pts ({from}→{to}) → confidence {confidence}% → action: {action}"
ODDS_SWING:  "Odds swing at {minute}' ({from}→{to}, Δ{delta}) → confidence {confidence}% → action: {action}"
TIME_DECAY:  "Odds diverging from expected curve at {minute}' → confidence {confidence}% → action: {action}"
SETTLE:      "Match ended {scoreHome}-{scoreAway} → settling {outcome} on-chain → tx {txSignature}"
```

Pure string interpolation. No generation step — deterministic and instant, which also protects the live demo from any network/latency risk.

### 6.4 Decision/Action Layer

- Maintains agent state (current position, if any).
- When a signal's `confidence` crosses a configurable threshold (e.g. 80), triggers an action: open/hold a simulated position, or if it's a match-ending event, trigger settlement.
- Logs every decision with full signal payload for auditability.

### 6.5 On-chain Settler (Solana + Anchor, devnet)

- Minimal Anchor program with a single instruction: `settle_market(matchId, outcome, proofHash)`.
- Program stores: match ID, final outcome, a hash/reference of the triggering match data, timestamp.
- Agent wallet (devnet keypair, funded via faucet) signs and submits the transaction.
- Frontend renders the resulting transaction signature as a clickable Solana Explorer (devnet) link — this is your "on-chain proof" moment in the demo.

### 6.6 Frontend (Live Feed UI)

- Left panel: live odds/score chart for the match (simple line/bar, updates per event).
- Right panel: scrolling narration feed (the demo centerpiece) — each line renders as it's generated, with a confidence badge and rule tag.
- Bottom: settlement status card — "PENDING" until match ends, then flips to "SETTLED" with tx link.
- Keep visual design clean and legible from a distance (judges watching a screen share) — large type for the narration feed, color-coded confidence (green >80, yellow 50-80, gray <50).

---

## 7. Suggested Folder Structure

```
settling-agent/
├── packages/
│   ├── ingestion/
│   │   ├── src/
│   │   │   ├── txline-client.ts       # live feed adapter
│   │   │   ├── replay-client.ts       # replay adapter, same interface
│   │   │   └── index.ts               # exports unified MatchEventSource
│   │   └── replay-data/
│   │       └── sample-match.json      # hand-built or recorded match timeline
│   ├── signal-engine/
│   │   ├── src/
│   │   │   ├── rules.config.ts        # thresholds, tunable
│   │   │   ├── rules/
│   │   │   │   ├── oddsSwing.ts
│   │   │   │   ├── scoreChange.ts
│   │   │   │   └── timeDecay.ts
│   │   │   └── index.ts               # evaluate(event) -> Signal[]
│   ├── narration-engine/
│   │   ├── src/
│   │   │   ├── templates.ts
│   │   │   └── index.ts               # render(signal) -> NarrationLine
│   ├── settlement/
│   │   ├── anchor-program/            # Anchor/Rust program
│   │   │   ├── programs/settling-agent/src/lib.rs
│   │   │   └── Anchor.toml
│   │   └── src/
│   │       └── settler.ts             # builds + signs + submits tx
│   └── agent-runtime/
│       ├── src/
│       │   └── index.ts               # orchestrates: ingest -> signal -> narrate -> decide -> settle
├── apps/
│   └── web/                           # Next.js frontend
│       ├── app/
│       │   ├── page.tsx               # live feed UI
│       │   └── api/stream/route.ts    # WS/SSE endpoint feeding frontend
│       └── components/
│           ├── OddsChart.tsx
│           ├── NarrationFeed.tsx
│           └── SettlementCard.tsx
├── .env.example
└── README.md
```

---

## 8. Build Order (phased — always demoable at each stage)

**Phase 1 — Skeleton with replay data (get something running end-to-end fast)**

1. Build `replay-client.ts` reading `sample-match.json`, emitting events on a timer.
2. Build signal engine with 2 rules (`SCORE_CHANGE`, `ODDS_SWING`) hardcoded thresholds.
3. Build narration engine with 3 templates.
4. Console-log the full pipeline: event → signal → narration line. **Milestone: pipeline works headless.**

**Phase 2 — Frontend live feed** 5. Stand up Next.js app with a simple SSE/WebSocket endpoint streaming narration lines. 6. Build `NarrationFeed.tsx` to render lines as they arrive. 7. Build `OddsChart.tsx` showing odds movement over time. **Milestone: demoable UI with fake data, no chain yet.**

**Phase 3 — On-chain settlement** 8. Write minimal Anchor program (`settle_market` instruction), deploy to devnet. 9. Fund a devnet wallet, wire `settler.ts` to sign and submit on match-end trigger. 10. Add `SettlementCard.tsx` showing pending → settled state with Explorer link. **Milestone: full pipeline, fake data, real chain.**

**Phase 4 — Real TxLINE integration (swap-in, not rewrite)** 11. Build `txline-client.ts` matching the same interface as `replay-client.ts`. 12. Swap adapter via config/env flag. **Milestone: real data, full pipeline.** 13. Add `TIME_DECAY_MISMATCH` rule and remaining narration templates for variety.

**Phase 5 — Polish for demo** 14. Add confidence-based color coding, clean up chart, add a "Rules" panel showing the exact thresholds live (reinforces "auditable, not black-box" pitch). 15. Rehearse 2-minute demo script; add a manual "replay this match" reset button in case live data misbehaves during judging.

---

## 9. Environment Variables (`.env.example`)

```
TXLINE_API_URL=
TXLINE_API_KEY=
SOLANA_RPC_URL=https://api.devnet.solana.com
AGENT_WALLET_SECRET_KEY=   # base58 devnet keypair, funded via faucet
ANCHOR_PROGRAM_ID=
USE_REPLAY_MODE=true       # flip to false once live TxLINE access confirmed
CONFIDENCE_SETTLE_THRESHOLD=80
```

---

## 10. Demo Script (2 minutes)

1. **(0:00-0:15)** One-liner: "This agent watches a live match, decides autonomously using explicit rules — no AI black box — and settles its own market on-chain."
2. **(0:15-0:45)** Point at the Rules panel: "Here are the exact thresholds it uses — fully auditable before it even trades."
3. **(0:45-1:30)** Let a goal or odds-swing event fire live (or trigger from replay): narration line appears, confidence badge, chart updates. Narrate it as it narrates itself.
4. **(1:30-1:50)** Match ends (or trigger manually): settlement card flips to SETTLED, click the Explorer link live on-chain.
5. **(1:50-2:00)** Close: "Every decision here traces to a rule and real match data — nothing hidden, nothing hallucinated."

---

## 11. Risks & Mitigations

| Risk                                                       | Mitigation                                                                                   |
| ---------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| TxLINE live access not available in time                   | Replay mode is the default build path, not a fallback — build it first                       |
| Devnet faucet rate-limited on demo day                     | Pre-fund wallet well before demo, keep a backup funded keypair                               |
| Live match has no interesting events during judging window | Use replay mode for the actual judged demo — it's deterministic and always compelling        |
| Solana devnet congestion/downtime                          | Test settlement flow well in advance; have a pre-recorded settlement tx as backup screenshot |

---

## 12. Instructions for Coding Agents

When implementing this PRD:

- Build in the phase order above — do not skip to Phase 4 before Phases 1-3 are demoable.
- Keep `rules.config.ts` and `templates.ts` as the only places thresholds/text live — no magic numbers scattered in logic files.
- The ingestion interface (`MatchEventSource`) must be identical for `replay-client.ts` and `txline-client.ts` — verify by running the full pipeline against both without touching downstream code.
- No LLM/AI API calls anywhere in this codebase — narration is 100% template interpolation.
- Prioritize a working end-to-end demo over feature completeness — a working Phase 3 build beats an incomplete Phase 5 build.
