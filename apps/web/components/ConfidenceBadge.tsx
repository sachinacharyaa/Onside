export function confidenceColor(confidence: number): string {
  if (confidence > 80) return "bg-emerald-500/15 text-emerald-300 border-emerald-500/40";
  if (confidence >= 50) return "bg-amber-500/15 text-amber-300 border-amber-500/40";
  return "bg-slate-500/15 text-slate-400 border-slate-500/40";
}

export function ConfidenceBadge({ confidence }: { confidence: number }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 font-mono text-xs font-semibold tabular-nums ${confidenceColor(confidence)}`}
    >
      {confidence}%
    </span>
  );
}
