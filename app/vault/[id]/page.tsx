"use client";

import { useRouter } from "next/navigation";
import { mockVaults, mockAgents } from "@/lib/mockData";
import { DefenseFeed } from "@/components/DefenseFeed";
import { AgentFeed } from "@/components/AgentFeed";
import { Button } from "@/components/Button";
import { useAuth } from "@/lib/authState";
import { useToast } from "@/lib/toastState";
import { formatCurrency, formatNumber } from "@/lib/utils";

const statusStyles: Record<string, string> = {
  operating: "bg-[rgba(74,222,128,0.12)] text-green-400",
  paused: "bg-[rgba(251,191,36,0.12)] text-yellow-400",
  graduating: "bg-[rgba(200,169,110,0.12)] text-gold",
};

// Next.js 14 App Router: params is a plain object, not a Promise.
// The Promise pattern is Next.js 15+ only.
export default function VaultPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const router = useRouter();
  const { walletConnected } = useAuth();
  const { showToast } = useToast();

  const vault = mockVaults.find((v) => v.id === id);
  if (!vault) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center px-4">
        <p className="text-abraxas-muted mb-4">Vault not found.</p>
        <Button onClick={() => router.push("/marketplace")}>Browse Vaults</Button>
      </div>
    );
  }

  const agent = mockAgents.find((a) => a.id === vault.agentId);

  const handleDeposit = () => {
    if (!walletConnected) {
      showToast("Connect your wallet to deposit. Use the button in the nav.");
      return;
    }
    showToast("Deposit flow — coming in full product launch.");
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <button
        onClick={() => router.back()}
        className="text-xs text-abraxas-subtle hover:text-gold transition-colors mb-6 inline-flex items-center gap-1.5"
      >
        ← Back
      </button>

      <div className="flex items-start justify-between gap-4 mb-8 flex-wrap">
        <div>
          <h1 className="font-display font-bold text-3xl md:text-4xl mb-1">{vault.name}</h1>
          <p className="text-sm text-abraxas-subtle">{vault.assetClass}</p>
        </div>
        <span className={`text-[0.68rem] font-bold px-3 py-1 rounded uppercase tracking-wider ${statusStyles[vault.status]}`}>
          {vault.status}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        <div className="space-y-5">
          <div className="bg-bg-2 border border-border rounded-card p-6">
            <p className="text-sm text-abraxas-muted leading-relaxed mb-6">{vault.description}</p>
            <div className="divide-y divide-border">
              {[
                { label: "TVL", value: formatCurrency(vault.tvl) },
                { label: "Lifetime PnL", value: formatCurrency(vault.lifetimePnl), color: "text-abraxas-green" },
                { label: "Yield YTD", value: `${vault.yieldYTD}%`, color: "text-abraxas-green" },
                { label: "Inception Date", value: vault.inceptionDate },
                { label: "Agent", value: `AGENT-${vault.agentId}`, mono: true },
                { label: "Actions Executed", value: formatNumber(vault.actionsExecuted) },
                { label: "Defense Events", value: String(vault.defenseEvents) },
                { label: "Unrecovered Positions", value: "0", color: "text-abraxas-green" },
              ].map(({ label, value, color, mono }) => (
                <div key={label} className="flex justify-between py-3">
                  <span className="text-sm text-abraxas-subtle">{label}</span>
                  <span className={`text-sm font-medium ${color ?? ""} ${mono ? "font-mono" : ""}`}>{value}</span>
                </div>
              ))}
            </div>
          </div>

          {agent && (
            <div className="bg-bg-2 border border-border rounded-card p-6">
              <p className="text-[0.68rem] uppercase tracking-wider text-abraxas-subtle mb-4">Assigned Agent</p>
              <div className="flex items-center justify-between mb-4">
                <div className="font-display font-bold text-lg text-gold">{agent.name}</div>
                <div className="flex items-center gap-1.5 text-xs text-abraxas-green">
                  <span className="w-1.5 h-1.5 rounded-full bg-abraxas-green" />
                  {agent.status}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-abraxas-subtle text-xs mb-1">Uptime</div>
                  <div className="font-medium">{agent.uptimePct}%</div>
                </div>
                <div>
                  <div className="text-abraxas-subtle text-xs mb-1">Actions</div>
                  <div className="font-medium">{formatNumber(agent.actionsExecuted)}</div>
                </div>
                <div className="col-span-2">
                  <div className="text-abraxas-subtle text-xs mb-1">Last Action</div>
                  <div className="font-medium">{agent.lastAction}</div>
                </div>
              </div>
            </div>
          )}

          <AgentFeed />
        </div>

        <div className="space-y-3">
          <Button fullWidth size="lg" onClick={handleDeposit}>Deposit to Vault</Button>
          <Button fullWidth size="lg" variant="secondary" onClick={() => showToast("Investor access — coming soon.")}>
            Open to Investors
          </Button>
          <Button fullWidth size="lg" variant="secondary" onClick={() => router.push("/defense")}>
            View Defense Log
          </Button>

          <div className="bg-bg-3 border border-border rounded-[10px] p-5">
            <p className="text-[0.68rem] text-abraxas-subtle uppercase tracking-wider mb-1">Projected Annual Yield</p>
            <p className="font-display font-bold text-2xl text-abraxas-green">
              {formatCurrency(Math.round(vault.tvl * vault.yieldYTD / 100))}
            </p>
            <p className="text-xs text-abraxas-subtle mt-1">Based on {vault.yieldYTD}% YTD</p>
          </div>

          <div className="bg-bg-3 border border-border rounded-[10px] p-5">
            <p className="text-[0.68rem] text-abraxas-subtle uppercase tracking-wider mb-1">Circuit Defense</p>
            <p className="font-display font-bold text-xl text-gold">{vault.defenseEvents} events</p>
            <p className="text-xs text-abraxas-green mt-1">$0 unrecovered</p>
          </div>
        </div>
      </div>
    </div>
  );
}
