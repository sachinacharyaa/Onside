import { useCallback, useEffect, useState } from "react";

type AgentWallet = {
  connected: boolean;
  address: string | null;
  short?: string;
  cluster?: string;
  label?: string;
};

type PhantomProvider = {
  isPhantom?: boolean;
  publicKey?: { toBase58(): string };
  connect(): Promise<{ publicKey: { toBase58(): string } }>;
  disconnect(): Promise<void>;
  on?(event: string, handler: () => void): void;
};

function getPhantom(): PhantomProvider | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { solana?: PhantomProvider; phantom?: { solana?: PhantomProvider } };
  return w.solana?.isPhantom ? w.solana : (w.phantom?.solana ?? null);
}

function shortAddr(addr: string) {
  return `${addr.slice(0, 4)}…${addr.slice(-4)}`;
}

/**
 * Dual wallet chip: agent settler (always shown when funded) + optional
 * Phantom connect for the viewer — matches hackathon demo expectations
 * without turning Onside into a trading front-end.
 */
export function WalletChip() {
  const [agent, setAgent] = useState<AgentWallet | null>(null);
  const [viewer, setViewer] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void fetch("/api/wallet")
      .then((r) => r.json())
      .then((data: AgentWallet) => setAgent(data))
      .catch(() => setAgent({ connected: false, address: null }));

    const phantom = getPhantom();
    if (phantom?.publicKey) setViewer(phantom.publicKey.toBase58());
  }, []);

  const connectViewer = useCallback(async () => {
    const phantom = getPhantom();
    if (!phantom) {
      window.open("https://phantom.app/", "_blank", "noopener,noreferrer");
      return;
    }
    setBusy(true);
    try {
      const res = await phantom.connect();
      setViewer(res.publicKey.toBase58());
    } catch (err) {
      console.warn("wallet connect cancelled", err);
    } finally {
      setBusy(false);
    }
  }, []);

  const disconnectViewer = useCallback(async () => {
    const phantom = getPhantom();
    try {
      await phantom?.disconnect?.();
    } catch {
      /* ignore */
    }
    setViewer(null);
  }, []);

  return (
    <div className="flex flex-wrap items-center gap-2">
      {agent?.connected && agent.short && (
        <a
          to={`https://explorer.solana.com/address/${agent.address}?cluster=devnet`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-10 items-center gap-2 rounded-full border border-hairline bg-panel px-3 py-1.5 text-xs transition-colors hover:border-turf/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-turf"
          title="Agent settler wallet on Solana Explorer"
        >
          <span className="h-2 w-2 rounded-full bg-turf shadow-[0_0_8px_var(--color-turf)]" aria-hidden />
          <span className="font-display font-semibold uppercase tracking-wider text-linesman">
            Agent
          </span>
          <span className="font-mono text-ink">{agent.short}</span>
        </a>
      )}

      {viewer ? (
        <button
          type="button"
          onClick={() => void disconnectViewer()}
          className="inline-flex min-h-10 items-center gap-2 rounded-full border border-turf/40 bg-turf/10 px-3 py-1.5 text-xs font-medium text-turf transition-colors hover:bg-turf/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-turf"
        >
          <span className="h-2 w-2 rounded-full bg-turf" aria-hidden />
          <span className="font-mono">{shortAddr(viewer)}</span>
        </button>
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={() => void connectViewer()}
          className="inline-flex min-h-10 items-center gap-2 rounded-full bg-turf px-4 py-1.5 font-display text-xs font-bold uppercase tracking-wider text-chalk transition-opacity hover:opacity-90 disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-turf"
        >
          {busy ? "Connecting…" : "Connect wallet"}
        </button>
      )}
    </div>
  );
}
