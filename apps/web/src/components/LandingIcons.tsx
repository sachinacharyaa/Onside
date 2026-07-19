/** Inline SVG marks for the landing — no emoji, no border-box icons. */

export function IconRadar({ className = "h-12 w-12" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden fill="none">
      <circle cx="32" cy="32" r="26" stroke="currentColor" strokeWidth="2" opacity="0.25" />
      <circle cx="32" cy="32" r="16" stroke="currentColor" strokeWidth="2" opacity="0.5" />
      <circle cx="32" cy="32" r="4" fill="currentColor" />
      <path d="M32 32L52 18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <path
        d="M32 6v6M32 52v6M6 32h6M52 32h6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.6"
      />
    </svg>
  );
}

export function IconWhistleCall({ className = "h-12 w-12" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden fill="none">
      <rect
        x="14"
        y="22"
        width="28"
        height="20"
        rx="10"
        fill="currentColor"
        opacity="0.9"
      />
      <circle cx="42" cy="32" r="10" fill="currentColor" />
      <circle cx="42" cy="32" r="4" fill="#0b0f0d" />
      <path d="M22 28h8M22 36h6" stroke="#0b0f0d" strokeWidth="2" strokeLinecap="round" />
      <path
        d="M50 18c4 4 6 8 6 14"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.5"
      />
    </svg>
  );
}

export function IconChainSettle({ className = "h-12 w-12" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden fill="none">
      <rect x="10" y="14" width="20" height="20" rx="4" stroke="currentColor" strokeWidth="2.5" />
      <rect x="34" y="30" width="20" height="20" rx="4" stroke="currentColor" strokeWidth="2.5" />
      <path
        d="M28 24h10M26 40h10"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path d="M16 22h8M16 28h5M40 38h8M40 44h5" stroke="currentColor" strokeWidth="1.5" opacity="0.5" />
    </svg>
  );
}

export function IconPitch({ className = "h-14 w-14" }: { className?: string }) {
  return (
    <svg viewBox="0 0 80 56" className={className} aria-hidden fill="none">
      <rect x="2" y="2" width="76" height="52" rx="4" stroke="currentColor" strokeWidth="2" />
      <line x1="40" y1="2" x2="40" y2="54" stroke="currentColor" strokeWidth="1.5" opacity="0.7" />
      <circle cx="40" cy="28" r="8" stroke="currentColor" strokeWidth="1.5" />
      <rect x="2" y="16" width="12" height="24" stroke="currentColor" strokeWidth="1.5" />
      <rect x="66" y="16" width="12" height="24" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export function IconBall({ className = "h-10 w-10" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
      <circle cx="24" cy="24" r="20" fill="currentColor" opacity="0.15" />
      <circle cx="24" cy="24" r="18" fill="none" stroke="currentColor" strokeWidth="2" />
      <path
        fill="currentColor"
        d="M24 12l5 3.5-2 6h-6l-2-6zM14 22l4-1 3 5-2 6-5-1-2-6zM34 22l-4-1-3 5 2 6 5-1 2-6zM18 36l6-2 6 2-2 4h-8z"
      />
    </svg>
  );
}

export function IconBook({ className = "h-10 w-10" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden fill="none">
      <path
        d="M10 8h14a4 4 0 014 4v28a3 3 0 00-3-3H10V8zM38 8H24a4 4 0 00-4 4v28a3 3 0 013-3h15V8z"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      <path d="M24 12v25" stroke="currentColor" strokeWidth="1.5" opacity="0.5" />
    </svg>
  );
}

export function MatchCrest({
  home,
  away,
  accent = "turf",
  className = "h-20 w-20",
}: {
  home: string;
  away: string;
  accent?: "turf" | "caution" | "whistle";
  className?: string;
}) {
  const color =
    accent === "whistle" ? "var(--color-whistle)" : accent === "caution" ? "var(--color-caution)" : "var(--color-turf)";
  const h = home.slice(0, 3).toUpperCase();
  const a = away.slice(0, 3).toUpperCase();

  return (
    <svg viewBox="0 0 96 96" className={className} aria-hidden>
      <circle cx="48" cy="48" r="44" fill={color} opacity="0.12" />
      <circle cx="48" cy="48" r="40" fill="none" stroke={color} strokeWidth="2.5" />
      <circle cx="48" cy="48" r="28" fill="none" stroke={color} strokeWidth="1.5" opacity="0.4" />
      <text
        x="48"
        y="42"
        textAnchor="middle"
        fill={color}
        fontFamily="Playfair Display, Georgia, serif"
        fontWeight="700"
        fontSize="14"
        letterSpacing="1"
      >
        {h}
      </text>
      <text
        x="48"
        y="58"
        textAnchor="middle"
        fill="var(--color-linesman)"
        fontFamily="Playfair Display, Georgia, serif"
        fontWeight="600"
        fontSize="10"
      >
        VS
      </text>
      <text
        x="48"
        y="74"
        textAnchor="middle"
        fill="var(--color-ink)"
        fontFamily="Playfair Display, Georgia, serif"
        fontWeight="700"
        fontSize="14"
        letterSpacing="1"
      >
        {a}
      </text>
    </svg>
  );
}
