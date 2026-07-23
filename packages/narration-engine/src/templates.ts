/**
 * ─── THE single source of truth for every sentence the agent says ───
 *
 * Pure string templates, rendered with plain interpolation. No generation
 * step, no LLM, no network — deterministic and instant.
 *
 * Placeholders: {team} {player} {minute} {delta} {from} {to} {expected}
 *               {confidence} {action} {scoreHome} {scoreAway} {outcome}
 *               {txSignature} {card}
 */
export const templates = {
  GOAL: "GOAL — {player} scores for {team} at {minute}' ({scoreHome}-{scoreAway}) → confidence {confidence}% → action: {action}",
  RED_CARD:
    "RED CARD — {player} ({team}) sent off at {minute}' → confidence {confidence}% → action: {action}",
  YELLOW_CARD:
    "Yellow — {player} ({team}) at {minute}' → noted (below action threshold)",
  ODDS_SWING:
    "Odds swing at {minute}' — home {from} → {to} (Δ{delta}pts implied) → confidence {confidence}% → action: {action}",
  MARKET_TICK:
    "{minute}' — markets {from} / {draw} / {to} → watching",
  TIME_DECAY:
    "Odds diverging from expected decay curve at {minute}' — leader priced {to} vs expected {expected} ({delta}pts off) → confidence {confidence}% → action: {action}",
  FULLTIME:
    "Full time — {scoreHome}-{scoreAway} → confidence {confidence}% → action: {action}",
  SETTLE:
    "Match ended {scoreHome}-{scoreAway} → settling {outcome} on-chain → tx {txSignature}",
  KICKOFF: "Kickoff — {team} market opens at {from} → agent watching",
} as const;

export type TemplateKey = keyof typeof templates;
