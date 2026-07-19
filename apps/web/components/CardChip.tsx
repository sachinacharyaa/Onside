/**
 * The literal referee's card, reserved EXCLUSIVELY for real card events
 * (player discipline). Rotated like a card held up. Yellow = caution,
 * red = sending off. Never used for agent actions.
 */
export function CardChip({ colour }: { colour: "yellow" | "red" }) {
  return (
    <span
      className={`inline-block h-4 w-3 rotate-6 rounded-[2px] shadow-sm ${
        colour === "yellow" ? "bg-caution" : "bg-whistle"
      }`}
      role="img"
      aria-label={colour === "yellow" ? "Yellow card" : "Red card"}
    />
  );
}
