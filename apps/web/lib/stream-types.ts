import type { MatchEvent, MatchMeta } from "@onside/ingestion";
import type { NarrationLine } from "@onside/narration-engine";
import type { SettlementProof } from "@onside/settlement";

export type StreamMessage =
  | { kind: "meta"; meta: MatchMeta; settleThreshold: number; mode: "replay" | "live" }
  | { kind: "event"; event: MatchEvent }
  | { kind: "narration"; line: NarrationLine }
  | { kind: "settlement:pending"; outcome: string }
  | { kind: "settlement"; proof: SettlementProof }
  | { kind: "agent-error"; message: string }
  | { kind: "end" };
