import { startTransition, useEffect, useState } from "react";

type AgentWallet = {
  connected: boolean;
  address: string | null;
  short?: string;
  cluster?: string;
  label?: string;
};

type ChipState =
  | { status: "loading" }
  | { status: "ready"; agent: AgentWallet }
  | { status: "error" };

/**
 * Shows the agent settler wallet only. The agent signs its own settlements —
 * no viewer / Phantom connect needed.
 */
export function WalletChip() {
  const [state, setState] = useState<ChipState>({ status: "loading" });

  useEffect(() => {
    const ctrl = new AbortController();
    const run = () => {
      void fetch("/api/wallet", { signal: ctrl.signal })
        .then(async (r) => {
          if (!r.ok) throw new Error(`wallet ${r.status}`);
          return r.json() as Promise<AgentWallet>;
        })
        .then((data) => {
          startTransition(() => setState({ status: "ready", agent: data }));
        })
        .catch((err: unknown) => {
          if (ctrl.signal.aborted) return;
          console.warn("Agent wallet status failed", err);
          startTransition(() => setState({ status: "error" }));
        });
    };

    // Defer off the critical path so first paint / INP stay snappy.
    const idle =
      typeof window !== "undefined" && "requestIdleCallback" in window
        ? window.requestIdleCallback(run, { timeout: 1500 })
        : window.setTimeout(run, 0);

    return () => {
      ctrl.abort();
      if (typeof window !== "undefined" && "cancelIdleCallback" in window) {
        window.cancelIdleCallback(idle as number);
      } else {
        window.clearTimeout(idle as number);
      }
    };
  }, []);

  if (state.status === "loading") {
    return (
      <span
        className="inline-flex min-h-10 items-center rounded-full border border-hairline bg-panel px-3 py-1.5 text-xs text-linesman"
        aria-busy="true"
      >
        Checking agent…
      </span>
    );
  }

  if (state.status === "error" || !state.agent?.connected || !state.agent.short || !state.agent.address) {
    const label =
      state.status === "ready" && state.agent?.label
        ? state.agent.label
        : "Agent wallet offline";
    return (
      <span
        className="inline-flex min-h-10 items-center gap-2 rounded-full border border-hairline bg-panel px-3 py-1.5 text-xs text-linesman"
        title={
          state.status === "error"
            ? "Could not reach /api/wallet — check Vercel env AGENT_WALLET_SECRET_KEY"
            : label
        }
      >
        <span className="h-2 w-2 rounded-full bg-caution/80" aria-hidden />
        {state.status === "error" ? "Agent API error" : "Agent wallet offline"}
      </span>
    );
  }

  const { agent } = state;
  return (
    <a
      href={`https://explorer.solana.com/address/${agent.address}?cluster=devnet`}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex min-h-10 items-center gap-2 rounded-full border border-hairline bg-panel px-3 py-1.5 text-xs transition-colors hover:border-turf/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-turf"
      title="Agent settler wallet on Solana Explorer"
    >
      <span className="h-2 w-2 rounded-full bg-turf shadow-[0_0_8px_var(--color-turf)]" aria-hidden />
      <span className="font-medium tracking-wide text-linesman">Agent</span>
      <span className="font-mono text-ink">{agent.short}</span>
    </a>
  );
}
