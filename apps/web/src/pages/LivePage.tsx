import { useSearchParams } from "react-router-dom";
import { LiveMatch } from "@/components/LiveMatch";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

export function LivePage() {
  const [params] = useSearchParams();
  const matchId = params.get("match") ?? "txline-18257739";

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <LiveMatch initialMatchId={matchId} />
      </main>
      <SiteFooter />
    </div>
  );
}
