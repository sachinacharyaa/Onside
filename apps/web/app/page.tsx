"use client";

import { useEffect, useState } from "react";
import type { MatchEvent, MatchMeta } from "@onside/ingestion";
import type { NarrationLine } from "@onside/narration-engine";
import type { SettlementProof } from "@onside/settlement";
import { NarrationFeed } from "@/components/NarrationFeed";
import { OddsChart } from "@/components/OddsChart";
import { RulesPanel } from "@/components/RulesPanel";
import { ScoreBoard } from "@/components/ScoreBoard";
import { SettlementCard, type SettlementStatus } from "@/components/SettlementCard";
import type { StreamMessage } from "@/lib/stream-types";

const FALLBACK_META: MatchMeta = {
  matchId: "—",
  homeTeam: "Home",
  awayTeam: "Away",
  competition: "Connecting to agent…",
};

export default function LiveFeedPage() {
  const [runId, setRunId] = useState(0);
  const [meta, setMeta] = useState<MatchMeta>(FALLBACK_META);
  const [mode, setMode] = useState<"replay" | "live">("replay");
  const [settleThreshold, setSettleThreshold] = useState(80);
  const [events, setEvents] = useState<MatchEvent[]>([]);
  const [lines, setLines] = useState<NarrationLine[]>([]);
  const [status, setStatus] = useState<SettlementStatus>("pending");
  const [proof, setProof] = useState<SettlementProof | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    setMeta(FALLBACK_META);
    setEvents([]);
    setLines([]);
    setStatus("pending");
    setProof(null);
    setDone(false);

    const source = new EventSource("/api/stream");
    source.onmessage = (e) => {
      const msg = JSON.parse(e.data) as StreamMessage;
      switch (msg.kind) {
        case "meta":
          setMeta(msg.meta);
          setMode(msg.mode);
          setSettleThreshold(msg.settleThreshold);
          break;
        case "event":
          setEvents((prev) => [...prev, msg.event]);
          break;
        case "narration":
          setLines((prev) => [...prev, msg.line]);
          break;
        case "settlement:pending":
          setStatus("settling");
          break;
        case "settlement":
          setStatus("settled");
          setProof(msg.proof);
          setDone(true);
          source.close();
          break;
        case "end":
          setDone(true);
          source.close();
          break;
        case "agent-error":
          console.warn("agent error:", msg.message);
          break;
      }
    };
    source.onerror = () => {
      // SSE closes when replay ends; nothing to retry mid-demo.
      if (source.readyState === EventSource.CLOSED) setDone(true);
    };
    return () => source.close();
  }, [runId]);

  const lastEvent = events.length > 0 ? events[events.length - 1] : null;

  return (
    <main className="mx-auto flex min-h-screen max-w-7xl flex-col gap-4 px-6 py-6">
      <header className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/15 text-xl">
            ⚽
          </span>
          <div>
            <h1 className="text-lg font-bold tracking-tight">
              Onside <span className="font-normal text-chalk-dim">· Settling Agent</span>
            </h1>
            <p className="text-xs text-chalk-dim">
              Deterministic rules · live narration · on-chain settlement — mode:{" "}
              <span className="font-mono text-chalk">{mode}</span>
            </p>
          </div>
        </div>
        <button
          onClick={() => setRunId((n) => n + 1)}
          className="ml-auto rounded-lg border border-line bg-pitch-800 px-4 py-2 text-sm font-medium text-chalk transition hover:border-emerald-500/50 hover:bg-pitch-700"
        >
          ↻ Replay this match
        </button>
      </header>

      <div className="rounded-xl border border-line bg-pitch-900/70 px-5 py-4">
        <ScoreBoard meta={meta} lastEvent={lastEvent} live={!done} />
      </div>

      <div className="grid flex-1 grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="flex flex-col gap-4 lg:col-span-2">
          <OddsChart events={events} meta={meta} />
          <RulesPanel settleThreshold={settleThreshold} />
        </div>
        <div className="min-h-[420px] lg:col-span-3">
          <NarrationFeed lines={lines} />
        </div>
      </div>

      <SettlementCard status={status} proof={proof} meta={meta} />
    </main>
  );
}
