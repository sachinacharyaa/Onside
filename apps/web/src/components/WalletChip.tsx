import { useEffect, useState } from "react";

type AgentWallet = {
  connected: boolean;
  address: string | null;
  short?: string;
  cluster?: string;
  label?: string;
};

/**
 * Shows the agent settler wallet only. The agent signs its own settlements —
 * no viewer / Phantom connect needed.
 */
export function WalletChip() {
  const [agent, setAgent] = useState<AgentWallet | null>(null);

  useEffect(() => {
    void fetch("/api/wallet")
      .then((r) => r.json())
      .then((data: AgentWallet) => setAgent(data))
      .catch(() => setAgent({ connected: false, address: null }));
  }, []);

  if (!agent?.connected || !agent.short || !agent.address) {
    return (
      <span className="inline-flex min-h-10 items-center rounded-full border border-hairline bg-panel px-3 py-1.5 text-xs text-linesman">
        Agent wallet offline
      </span>
    );
  }

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
