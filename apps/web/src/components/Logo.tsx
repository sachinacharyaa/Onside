import { Link } from "react-router-dom";

export function LogoMark({
  className = "h-9 w-9",
}: {
  className?: string;
  tone?: "ink" | "chalk";
  priority?: boolean;
}) {
  return (
    <span
      className={`relative inline-flex shrink-0 overflow-hidden rounded-[18%] shadow-[0_0_24px_var(--color-glow)] ring-1 ring-turf/20 ${className}`}
    >
      <img
        src="/brand/onside-mark.png"
        alt=""
        className="h-full w-full object-cover"
        width={96}
        height={96}
        decoding="async"
      />
    </span>
  );
}

export function Logo({
  href = "/",
  size = "nav",
}: {
  href?: string;
  size?: "nav" | "hero";
  tone?: "ink" | "chalk";
}) {
  if (size === "hero") {
    return (
      <Link
        to={href}
        className="inline-flex items-center gap-4 text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-turf"
      >
        <LogoMark className="h-20 w-20 sm:h-24 sm:w-24" />
        <span className="flex flex-col">
          <span className="font-display text-5xl font-semibold leading-none tracking-tight sm:text-6xl">
            Onside
          </span>
          <span className="mt-2 text-sm font-medium tracking-wide text-linesman sm:text-base">
            Match official for markets
          </span>
        </span>
      </Link>
    );
  }

  return (
    <Link
      to={href}
      className="inline-flex items-center gap-2.5 text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-turf"
    >
      <LogoMark className="h-9 w-9" />
      <span className="flex flex-col leading-none">
        <span className="font-display text-lg font-semibold tracking-tight">Onside</span>
        <span className="mt-1 text-xs font-medium tracking-wide text-linesman">
          Settling agent
        </span>
      </span>
    </Link>
  );
}
