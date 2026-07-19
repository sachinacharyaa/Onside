import type { NarrationLine } from "@onside/narration-engine";
import { executedLabel, isExecuted, sideOfLine, type TeamSide } from "@/lib/log-model";
import type { DecisionAction } from "@/lib/stream-types";
import { CardChip } from "./CardChip";
import { ExecutedStamp } from "./Stamp";

/** Border + type tint follow TEAM only — never execution state. */
const ACCENT: Record<TeamSide, string> = {
  home: "text-turf border-turf",
  away: "text-whistle border-whistle",
  neutral: "text-ink border-linesman",
};

/** Stamp seal inherits currentColor — same team rule as the log entry. */
const STAMP: Record<TeamSide, string> = {
  home: "text-turf",
  away: "text-whistle",
  neutral: "text-ink",
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
}: {
  lines: NarrationLine[];
  decisions: Record<string, DecisionAction>;
  settleThreshold: number;
}) {
  const newestFirst = [...lines].reverse();

  return (
    <section
      aria-label="Decision log"
      className="flex h-full flex-col rounded-2xl border border-hairline bg-panel/80 shadow-[0_12px_40px_rgba(0,0,0,0.35)]"
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
                  executed ? "text-base text-ink sm:text-[17px]" : "text-sm text-linesman sm:text-[15px]"
                }`}
              >
                {line.text}
              </p>

              <div className="mt-2">
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
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
