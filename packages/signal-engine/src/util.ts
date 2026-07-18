/** Implied win probability (%) from decimal odds. Overround ignored — deterministic and simple. */
export function impliedProb(decimalOdds: number): number {
  return 100 / decimalOdds;
}

export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

let counter = 0;

/** Deterministic, monotonically increasing signal id (no randomness in the pipeline). */
export function nextSignalId(rule: string, minute: number): string {
  counter += 1;
  return `sig-${String(counter).padStart(3, "0")}-${rule.toLowerCase()}-m${minute}`;
}
