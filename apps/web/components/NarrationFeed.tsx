"use client";

import { useEffect, useRef } from "react";
import type { NarrationLine } from "@onside/narration-engine";
import { ConfidenceBadge } from "./ConfidenceBadge";

const RULE_TAG: Record<string, string> = {
  SCORE_CHANGE: "text-emerald-300 border-emerald-500/40",
  ODDS_SWING: "text-sky-300 border-sky-500/40",
  TIME_DECAY_MISMATCH: "text-fuchsia-300 border-fuchsia-500/40",
};

/**
 * The demo centerpiece: scrolling reasoning feed, one line per triggered
 * rule, with confidence badge and rule tag. Large type — legible from a
 * screen share.
 */
export function NarrationFeed({ lines }: { lines: NarrationLine[] }) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [lines.length]);

  return (
    <div className="flex h-full flex-col rounded-xl border border-line bg-pitch-900/70">
      <div className="flex items-center justify-between border-b border-line px-5 py-3">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-chalk-dim">
          Agent reasoning feed
        </h2>
        <span className="font-mono text-xs text-chalk-dim">{lines.length} signals</span>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
        {lines.length === 0 && (
          <p className="pt-8 text-center text-chalk-dim">
            Waiting for match events… every line that appears here traces to a named rule.
          </p>
        )}
        {lines.map((line, i) => (
          <div
            key={`${line.signal.id}-${i}`}
            className="feed-in rounded-lg border border-line bg-pitch-800/60 px-4 py-3"
          >
            <div className="mb-1.5 flex flex-wrap items-center gap-2">
              <span
                className={`rounded border px-2 py-0.5 font-mono text-[11px] font-semibold tracking-wide ${RULE_TAG[line.signal.rule] ?? "text-slate-300 border-slate-500/40"}`}
              >
                {line.signal.rule}
              </span>
              <ConfidenceBadge confidence={line.signal.confidence} />
              <span className="ml-auto font-mono text-xs text-chalk-dim">
                {line.signal.triggeredBy.minute}&rsquo;
              </span>
            </div>
            <p className="text-[15px] leading-relaxed text-chalk">{line.text}</p>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
