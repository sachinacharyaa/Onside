import type { MatchMeta } from "@onside/ingestion";
import type { Signal } from "@onside/signal-engine";
import { templates, type TemplateKey } from "./templates.js";

export { templates, type TemplateKey } from "./templates.js";

export type NarrationLine = {
  text: string; // fully rendered sentence
  signal: Signal;
  createdAt: string;
};

function interpolate(template: string, values: Record<string, string | number | undefined>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => {
    const v = values[key];
    return v === undefined ? "—" : String(v);
  });
}

function pickTemplate(signal: Signal): TemplateKey {
  const event = signal.triggeredBy;
  if (event.type === "kickoff") return "KICKOFF";
  if (signal.rule === "SCORE_CHANGE") {
    if (event.type === "goal") return "GOAL";
    if (event.type === "card" && event.card === "yellow") return "YELLOW_CARD";
    if (event.type === "card") return "RED_CARD";
    if (event.type === "fulltime") return "FULLTIME";
  }
  if (signal.rule === "TIME_DECAY_MISMATCH") return "TIME_DECAY";
  if (signal.rule === "ODDS_SWING" && signal.confidence === 0 && signal.suggestedAction === "HOLD") {
    return "MARKET_TICK";
  }
  return "ODDS_SWING";
}

/**
 * render(signal) -> NarrationLine. 100% template interpolation — the
 * narration layer cannot say anything the signal doesn't contain.
 */
export function render(signal: Signal, meta: MatchMeta): NarrationLine {
  const event = signal.triggeredBy;
  const teamName =
    event.team === "home" ? meta.homeTeam : event.team === "away" ? meta.awayTeam : meta.homeTeam;

  const text = interpolate(templates[pickTemplate(signal)], {
    team: teamName,
    player: event.player,
    minute: event.minute,
    delta: signal.delta !== undefined ? Math.abs(signal.delta) : undefined,
    from: signal.detail?.fromOdds,
    to: signal.detail?.toOdds,
    draw: signal.detail?.drawOdds,
    expected: signal.detail?.expectedOdds,
    confidence: signal.confidence,
    action: signal.suggestedAction,
    scoreHome: event.scoreHome,
    scoreAway: event.scoreAway,
  });

  return { text, signal, createdAt: new Date().toISOString() };
}

/** Rendered when the on-chain settlement confirms. */
export function renderSettlement(
  signal: Signal,
  outcome: "home" | "away" | "draw",
  txSignature: string,
  meta: MatchMeta,
): NarrationLine {
  const event = signal.triggeredBy;
  const outcomeLabel =
    outcome === "home" ? meta.homeTeam : outcome === "away" ? meta.awayTeam : "DRAW";
  const text = interpolate(templates.SETTLE, {
    scoreHome: event.scoreHome,
    scoreAway: event.scoreAway,
    outcome: outcomeLabel,
    txSignature,
  });
  return { text, signal, createdAt: new Date().toISOString() };
}
