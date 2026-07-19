import type { NarrationLine } from "@onside/narration-engine";
import type { SettlementProof } from "@onside/settlement";
import { executedLabel, isExecuted, sideOfLine, type TeamSide } from "@/lib/log-model";
import type { DecisionAction } from "@/lib/stream-types";
import { CardChip } from "./CardChip";
import { ExecutedStamp } from "./Stamp";

/** Border + type tint follow TEAM only — never execution state. */
const ACCENT: Record<TeamSide, string> = {
  home: "text-turf border-turf",
  away: "text-whistle border-whistle",
  neutral: "text-linesman border-linesman",
};

/** Stamp seal inherits currentColor — same team rule as the log entry. */
const STAMP: Record<TeamSide, string> = {
  home: "text-turf",
  away: "text-whistle",
  neutral: "text-linesman",
};

const RULE_LABEL: Record<string, string> = {
  SCORE_CHANGE: "Score change",
  ODDS_SWING: "Odds swing",
  TIME_DECAY_MISMATCH: "Decay mismatch",
};

/**
 * The hero: the official's decision log. Newest entry first.
 * Team decides color; the stamp alone says whether the agent acted.
 */
export function DecisionLog({
  lines,
  decisions,
  settleThreshold,
  proof = null,
}: {
  lines: NarrationLine[];
  decisions: Record<string, DecisionAction>;
  settleThreshold: number;
  proof?: SettlementProof | null;
}) {
  const newestFirst = [...lines].reverse();

  return (
    <section
      aria-label="Decision log"
      className="flex h-full flex-col rounded-2xl border border-hairline bg-panel shadow-[0_8px_28px_rgba(24,38,32,0.06)]"
    >
      <header className="border-b border-hairline px-5 py-4 sm:px-6">
        <h2 className="font-display text-2xl font-semibold tracking-tight">Decision log</h2>
        <p className="mt-1 text-sm leading-relaxed text-linesman">
          Every entry traces to a named rule and a real match event.
        </p>
      </header>

      <ol className="flex-1 space-y-0 overflow-y-auto px-2 py-2 sm:px-3" aria-live="polite">
        {newestFirst.length === 0 && (
          <li className="px-4 py-10 text-center text-sm leading-relaxed text-linesman sm:text-base">
            Waiting for kickoff. The agent writes every call it makes, and every one it declines,
            into this log.
          </li>
        )}

        {newestFirst.map((line, i) => {
          const side = sideOfLine(line);
          const action = decisions[line.signal.id];
          const executed = isExecuted(action);
          const event = line.signal.triggeredBy;
          const isCardEvent = event.type === "card" && event.card !== undefined;
          const accent = ACCENT[side];
          const isSettleLine =
            line.signal.suggestedAction.startsWith("SETTLE_") ||
            (proof != null && line.text.includes(proof.txSignature));
          const showProofLink = Boolean(proof?.explorerUrl && isSettleLine);

          return (
            <li
              key={`${line.signal.id}-${i}`}
              className={`log-enter border-l-[3px] px-4 py-3 sm:px-5 ${accent} ${
                executed ? "" : "opacity-70"
              }`}
            >
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="font-display text-xl font-semibold tabular-nums">
                  {event.minute}&rsquo;
                </span>
                <span className="text-sm font-medium tracking-wide">
                  {RULE_LABEL[line.signal.rule] ?? line.signal.rule}
                </span>
                {isCardEvent && <CardChip colour={event.card!} />}
                <span className="text-sm text-linesman">
                  {line.signal.confidence}% confidence
                </span>
              </div>

              <p
                className={`mt-1 leading-relaxed ${
                  executed
                    ? "text-base text-ink sm:text-[17px]"
                    : "text-sm text-linesman sm:text-[15px]"
                }`}
              >
                {line.text}
              </p>

              <div className="mt-2 flex flex-wrap items-center gap-3">
                {executed ? (
                  <span className={STAMP[side]}>
                    <ExecutedStamp label={executedLabel(line)} />
                  </span>
                ) : action === "held" ? (
                  <span className="text-sm italic text-linesman">
                    Cleared the bar. Rule advises holding, so no trade.
                  </span>
                ) : action === "below_threshold" ? (
                  <span className="text-sm italic text-linesman">
                    Noted. Didn&rsquo;t clear the {settleThreshold}% bar. No action taken.
                  </span>
                ) : null}

                {showProofLink && proof && (
                  <a
                    href={proof.explorerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-turf underline decoration-turf/40 underline-offset-4 hover:decoration-turf"
                  >
                    View settlement tx ↗
                  </a>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
