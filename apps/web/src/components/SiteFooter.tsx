import { Link } from "react-router-dom";
import { Logo } from "./Logo";

export function SiteFooter() {
  return (
    <footer className="mt-auto bg-gradient-to-t from-panel/90 to-transparent">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-10 sm:flex-row sm:items-start sm:justify-between sm:px-8">
        <div>
          <Logo tone="chalk" />
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-linesman">
            Glass-box settling agent for live World Cup markets. Explicit rules. Plain-language
            calls. On-chain proof, not a black-box trader.
          </p>
        </div>
        <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm font-medium">
          <Link
            to="/live"
            className="text-linesman hover:text-turf focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-turf"
          >
            Live
          </Link>
          <Link
            to="/rulebook"
            className="text-linesman hover:text-turf focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-turf"
          >
            Rulebook
          </Link>
          <a
            href="https://github.com/sachinacharyaa/Onside"
            target="_blank"
            rel="noopener noreferrer"
            className="text-linesman hover:text-turf focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-turf"
          >
            GitHub ↗
          </a>
        </div>
      </div>
      <div className="border-t border-hairline px-5 py-3 text-center text-xs text-linesman sm:px-8">
        Track 3, Trading Tools and Agents, Solana, TxLINE
      </div>
    </footer>
  );
}
