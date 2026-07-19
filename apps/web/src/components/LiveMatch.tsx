import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { MatchEvent, MatchMeta } from "@onside/ingestion";
import type { NarrationLine } from "@onside/narration-engine";
import type { SettlementProof } from "@onside/settlement";
import { DecisionLog } from "@/components/DecisionLog";
import { FullTimeReport, type SettlementStatus } from "@/components/FullTimeReport";
import { MarketPulse } from "@/components/MarketPulse";
import { ScoreboardBand } from "@/components/ScoreboardBand";
import type { DecisionAction, MatchOption, StreamMessage } from "@/lib/stream-types";

const FALLBACK_META: MatchMeta = {
  matchId: "—",
  homeTeam: "Home",
  awayTeam: "Away",
  competition: "Connecting…",
};

/**
 * Live match stage — decision log + settlement are primary.
 * Market pulse is supporting. Rulebook lives on its own route.
 */
export function LiveMatch({ initialMatchId = "bra-fra" }: { initialMatchId?: string }) {
  const [matchId, setMatchId] = useState(initialMatchId);

  useEffect(() => {
    setMatchId(initialMatchId);
  }, [initialMatchId]);
  const [runId, setRunId] = useState(0);
  const [matches, setMatches] = useState<MatchOption[]>([]);
  const [meta, setMeta] = useState<MatchMeta>(FALLBACK_META);
  const [mode, setMode] = useState<"replay" | "live">("replay");
  const [settleThreshold, setSettleThreshold] = useState(80);
  const [events, setEvents] = useState<MatchEvent[]>([]);
  const [lines, setLines] = useState<NarrationLine[]>([]);
  const [decisions, setDecisions] = useState<Record<string, DecisionAction>>({});
  const [status, setStatus] = useState<SettlementStatus>("pending");
  const [proof, setProof] = useState<SettlementProof | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    setMeta(FALLBACK_META);
    setEvents([]);
    setLines([]);
    setDecisions({});
    setStatus("pending");
    setProof(null);
    setDone(false);

    const source = new EventSource(`/api/stream?match=${encodeURIComponent(matchId)}`);
    source.onmessage = (e) => {
      const msg = JSON.parse(e.data) as StreamMessage;
      switch (msg.kind) {
        case "meta":
          setMeta(msg.meta);
          setMode(msg.mode);
          setSettleThreshold(msg.settleThreshold);
          setMatches(msg.matches);
          break;
        case "event":
          setEvents((prev) => [...prev, msg.event]);
          break;
        case "narration":
          setLines((prev) => [...prev, msg.line]);
          break;
        case "decision":
          setDecisions((prev) => ({ ...prev, [msg.signalId]: msg.action }));
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
      if (source.readyState === EventSource.CLOSED) setDone(true);
    };
    return () => source.close();
  }, [runId, matchId]);

  const lastEvent = events.length > 0 ? events[events.length - 1] : null;

  return (
    <div>
      <div className="border-b border-hairline bg-chalk">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-3 px-5 py-3 sm:px-8">
          <div className="min-w-0 flex-1">
            <p className="font-display text-xs font-semibold uppercase tracking-[0.18em] text-linesman">
              Live stage · {mode === "replay" ? "replay" : "TxLINE live"}
            </p>
            <p className="truncate text-sm text-ink">
              Watch every call as the agent writes it — stamp = acted, dim = noted only.
            </p>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <span className="font-display text-[12px] font-semibold uppercase tracking-wider text-linesman">
              Match
            </span>
            <select
              value={matchId}
              onChange={(e) => {
                setMatchId(e.target.value);
                setRunId((n) => n + 1);
              }}
              className="min-h-10 min-w-[11rem] rounded-sm border border-hairline bg-chalk-2 px-3 py-1.5 text-sm text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-turf"
            >
              {(matches.length > 0 ? matches : [{ id: matchId, meta }]).map((m) => (
                <option key={m.id} value={m.id}>
                  {m.meta.homeTeam} vs {m.meta.awayTeam}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            onClick={() => setRunId((n) => n + 1)}
            className="min-h-10 rounded-full bg-turf px-4 py-1.5 font-display text-sm font-semibold uppercase tracking-wider text-chalk transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-turf"
          >
            Replay
          </button>
        </div>
      </div>

      <ScoreboardBand meta={meta} lastEvent={lastEvent} live={!done} />

      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-5 px-5 py-5 lg:grid-cols-5 lg:gap-6 lg:px-8 lg:py-6">
        <div className="min-h-[28rem] lg:col-span-3 lg:min-h-[34rem]">
          <DecisionLog
            lines={lines}
            decisions={decisions}
            settleThreshold={settleThreshold}
          />
        </div>

        <aside className="flex flex-col gap-5 lg:col-span-2">
          <FullTimeReport status={status} proof={proof} meta={meta} />
          <MarketPulse events={events} meta={meta} />
          <p className="text-sm text-linesman">
            Thresholds live in the{" "}
            <Link
              to="/rulebook"
              className="font-medium text-turf underline decoration-turf/40 underline-offset-4 hover:decoration-turf focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-turf"
            >
              rulebook
            </Link>
            — the agent acts only above {settleThreshold}% confidence.
          </p>
        </aside>
      </div>
    </div>
  );
}
