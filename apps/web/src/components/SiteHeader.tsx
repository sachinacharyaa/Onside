import { Link, useLocation } from "react-router-dom";
import { Logo } from "./Logo";
import { WalletChip } from "./WalletChip";

const NAV = [
  { href: "/", label: "Home" },
  { href: "/live", label: "Live" },
  { href: "/rulebook", label: "Rulebook" },
  { href: "/#proof", label: "Proof" },
] as const;

export function SiteHeader() {
  const { pathname } = useLocation();

  return (
    <header className="sticky top-0 z-40 bg-chalk/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-3 px-5 py-3 sm:px-8">
        <Logo tone="chalk" />

        <nav aria-label="Primary" className="hidden items-center gap-0.5 md:flex">
          {NAV.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : !item.href.includes("#") && pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                to={item.href}
                className={`rounded-full px-3.5 py-2 font-display text-sm font-semibold uppercase tracking-wider transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-turf ${
                  active ? "bg-turf/15 text-turf" : "text-linesman hover:text-ink"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto">
          <WalletChip />
        </div>
      </div>

      <nav
        aria-label="Mobile"
        className="flex gap-1 overflow-x-auto px-3 py-1.5 md:hidden"
      >
        {NAV.map((item) => (
          <Link
            key={item.href}
            to={item.href}
            className={`whitespace-nowrap rounded-full px-3 py-2 font-display text-xs font-semibold uppercase tracking-wider ${
              pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href))
                ? "bg-turf/15 text-turf"
                : "text-linesman"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
