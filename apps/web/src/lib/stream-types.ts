import type { MatchEvent, MatchMeta } from "@onside/ingestion";
import type { NarrationLine } from "@onside/narration-engine";
import type { SettlementProof } from "@onside/settlement";

export type MatchOption = { id: string; meta: MatchMeta };

/** How the agent acted on a signal (mirrors the runtime's Decision.action). */
export type DecisionAction = "opened" | "held" | "settling" | "below_threshold";

export type StreamMessage =
  | {
      kind: "meta";
      meta: MatchMeta;
      settleThreshold: number;
      mode: "replay" | "live";
      matchId: string;
      matches: MatchOption[];
    }
  /** One match event + any signals it produced — applied atomically in the UI. */
  | {
      kind: "tick";
      event: MatchEvent;
      lines: NarrationLine[];
      decisions: { signalId: string; action: DecisionAction }[];
    }
  /** Post-settlement narration (and legacy frames). */
  | { kind: "narration"; line: NarrationLine }
  | { kind: "settlement:pending"; outcome: string }
  | { kind: "settlement"; proof: SettlementProof }
  | { kind: "settlement:failed"; outcome: string; message: string }
  | { kind: "agent-error"; message: string }
  | { kind: "end" };
