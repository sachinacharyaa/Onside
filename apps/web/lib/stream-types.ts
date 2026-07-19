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
  | { kind: "event"; event: MatchEvent }
  | { kind: "narration"; line: NarrationLine }
  | { kind: "decision"; signalId: string; action: DecisionAction }
  | { kind: "settlement:pending"; outcome: string }
  | { kind: "settlement"; proof: SettlementProof }
  | { kind: "agent-error"; message: string }
  | { kind: "end" };
