/**
 * The signature device: a filled official's seal, shown ONLY when the
 * agent executed (confidence cleared the threshold and it acted).
 * Rendered in the team's own color via currentColor. Never rotated —
 * rotation belongs to the literal referee-card silhouettes.
 */

function rosettePoints(cx: number, cy: number, outer: number, inner: number, teeth: number): string {
  const pts: string[] = [];
  for (let i = 0; i < teeth * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (Math.PI * i) / teeth - Math.PI / 2;
    pts.push(`${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`);
  }
  return pts.join(" ");
}

const ROSETTE = rosettePoints(12, 12, 11, 9.4, 12);

export function SealIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" focusable="false">
      <polygon points={ROSETTE} fill="currentColor" />
      <path
        d="M7.8 12.2l2.7 2.7 5.7-5.8"
        fill="none"
        stroke="var(--color-chalk)"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ExecutedStamp({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-sm border border-current px-2 py-0.5">
      <SealIcon className="h-4 w-4 shrink-0" />
      <span className="font-display text-[13px] font-semibold uppercase tracking-wider">
        Executed · {label}
      </span>
    </span>
  );
}
