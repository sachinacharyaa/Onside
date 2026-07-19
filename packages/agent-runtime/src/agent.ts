import { EventEmitter } from "node:events";
import {
  createMatchEventSource,
  type MatchEvent,
  type MatchEventSource,
  type MatchMeta,
} from "@onside/ingestion";
import { render, renderSettlement, type NarrationLine } from "@onside/narration-engine";
import { settleOnChain, type Outcome, type SettlementProof } from "@onside/settlement";
import { createSignalEngine, type Signal } from "@onside/signal-engine";
import type { AgentConfig } from "./config.js";

export type Position = { side: "home" | "away"; openedAtMinute: number; bySignal: string } | null;

export type Decision = {
  signal: Signal;
  action: "opened" | "held" | "settling" | "below_threshold";
  position: Position;
  at: string;
};

export type AgentState = {
  position: Position;
  settlement: "idle" | "pending" | "settled" | "failed";
  proof: SettlementProof | null;
  decisions: Decision[];
};

export interface SettlingAgent extends EventEmitter {
  readonly meta: MatchMeta;
  readonly state: AgentState;
  start(): void;
  stop(): void;
}

/**
 * Orchestrates the full pipeline:
 * ingest -> evaluate rules -> narrate -> decide -> settle on-chain.
 *
 * Emits: "event" (MatchEvent), "narration" (NarrationLine),
 *        "decision" (Decision), "settlement" (SettlementProof),
 *        "error" (Error), "end" ().
 */
export function createAgent(config: AgentConfig): SettlingAgent {
  const emitter = new EventEmitter() as SettlingAgent & { meta: MatchMeta; state: AgentState };
  const source: MatchEventSource = createMatchEventSource(config);
  const engine = createSignalEngine();

  const state: AgentState = { position: null, settlement: "idle", proof: null, decisions: [] };
  Object.defineProperty(emitter, "meta", { value: source.meta, enumerable: true });
  Object.defineProperty(emitter, "state", { value: state, enumerable: true });

  function decide(signal: Signal): void {
    const at = new Date().toISOString();
    let decision: Decision;

    if (signal.confidence < config.settleThreshold) {
      decision = { signal, action: "below_threshold", position: state.position, at };
    } else if (signal.suggestedAction === "OPEN_HOME" || signal.suggestedAction === "OPEN_AWAY") {
      const side = signal.suggestedAction === "OPEN_HOME" ? "home" : "away";
      state.position = { side, openedAtMinute: signal.triggeredBy.minute, bySignal: signal.id };
      decision = { signal, action: "opened", position: state.position, at };
    } else if (signal.suggestedAction.startsWith("SETTLE_")) {
      decision = { signal, action: "settling", position: state.position, at };
      void settle(signal);
    } else {
      decision = { signal, action: "held", position: state.position, at };
    }

    state.decisions.push(decision);
    emitter.emit("decision", decision);
  }

  async function settle(signal: Signal): Promise<void> {
    const outcome: Outcome =
      signal.suggestedAction === "SETTLE_HOME"
        ? "home"
        : signal.suggestedAction === "SETTLE_AWAY"
          ? "away"
          : "draw";
    state.settlement = "pending";
    emitter.emit("settlement:pending", { outcome });
    try {
      const proof = await settleOnChain(
        {
          rpcUrl: config.solanaRpcUrl,
          walletSecretKey: config.walletSecretKey,
          programId: config.programId,
        },
        signal.triggeredBy.matchId,
        outcome,
        signal,
      );
      state.settlement = "settled";
      state.proof = proof;
      emitter.emit("narration", renderSettlement(signal, outcome, proof.txSignature, source.meta));
      emitter.emit("settlement", proof);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      state.settlement = "failed";
      state.proof = null;
      // Never fabricate a SIMULATED- signature. Surface failure so the UI can retry.
      emitter.emit("error", error);
      emitter.emit("settlement:failed", { outcome, message: error.message });
    }
  }

  source.on("event", (event: MatchEvent) => {
    emitter.emit("event", event);
    for (const signal of engine.evaluate(event)) {
      emitter.emit("narration", render(signal, source.meta));
      decide(signal);
    }
  });
  source.on("end", () => emitter.emit("end"));
  source.on("error", (err: Error) => emitter.emit("error", err));

  emitter.start = () => source.start();
  emitter.stop = () => source.stop();
  return emitter;
}
