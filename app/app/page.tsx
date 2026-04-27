"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/authState";
import { useToast } from "@/lib/toastState";
import { StatCard } from "@/components/StatCard";
import { Button } from "@/components/Button";
import { WalletGate } from "@/components/WalletGate";
import { AgentFeed } from "@/components/AgentFeed";
import { LiveAbraStatus } from "@/components/LiveAbraStatus";
import { LiveBalances } from "@/components/LiveBalances";
import { userStats, userPositions, mockVaults, mockAgents } from "@/lib/mockData";
import { formatCurrency, formatNumber } from "@/lib/utils";

function DashboardContent() {
  const router = useRouter();
  const { walletConnected, walletAddress, user } = useAuth();
  const { showToast } = useToast();

  const handleAction = (href: string, needsWallet = true) => {
    if (needsWallet && !walletConnected) {
      showToast("Connect your wallet to continue.");
      return;
    }
    router.push(href);
  };

  const displayName = user?.name || user?.email || null;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-8 flex-wrap gap-4">
        <div>
          <p className="text-[0.68rem] uppercase tracking-widest text-abraxas-subtle mb-1">
            {displayName ? `Welcome, ${displayName}` : "Your operating positions"}
          </p>
          <h1 className="font-display font-bold text-2xl md:text-3xl">Dashboard</h1>
        </div>
        <div className="flex flex-col items-end gap-2">
          {user?.email && (
            <div className="flex items-center gap-2 text-xs text-abraxas-muted">
              {user.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.image}
                  alt=""
                  className="w-5 h-5 rounded-full"
                />
              )}
              <span>{user.email}</span>
            </div>
          )}
          {walletConnected && (
            <div className="flex items-center gap-2 text-xs text-gold border border-border-2 px-3 py-1.5 rounded-md font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-abraxas-green" />
              {walletAddress}
            </div>
          )}
        </div>
      </div>

      {/* Live on-chain data row — real wallet balances + ABRA verification */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-6">
        <LiveBalances />
        <LiveAbraStatus />
      </div>

      {/* Stats (mock — portfolio metrics; will become real once vaults are live) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard label="Portfolio Value" value={formatCurrency(userStats.currentValue)}
          sub={`+${formatCurrency(userStats.currentValue - userStats.totalDeposited)} total`} subVariant="positive" />
        <StatCard label="Yield Generated" value={formatCurrency(userStats.yieldGenerated)}
          sub="Since first deposit" subVariant="positive" valueColor="text-abraxas-green" />
        <StatCard label="Available Capital" value={formatCurrency(userStats.availableCapital)}
          sub="Ready to deploy" subVariant="neutral" valueColor="text-gold" />
        <StatCard label="Active Positions" value={String(userStats.activePositions)}
          sub="Across 3 vaults" subVariant="neutral" />
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        {[
          { icon: "◈", label: "New Position", href: "/marketplace" },
          { icon: "→", label: "Use Capital", href: "/use" },
          { icon: "▦", label: "Live Feed", href: "/live" },
          { icon: "◉", label: "Formations", href: "/formations" },
        ].map((btn) => (
          <button key={btn.label} onClick={() => handleAction(btn.href)}
            className="bg-bg-3 border border-border rounded-[10px] p-4 text-center hover:border-gold hover:bg-gold-dim transition-colors cursor-pointer group">
            <div className="text-xl mb-2 group-hover:text-gold transition-colors">{btn.icon}</div>
            <span className="font-display text-xs font-semibold block">{btn.label}</span>
          </button>
        ))}
      </div>

      {/* Vault positions */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-semibold text-base">Your Vault Positions</h2>
          <Link href="/marketplace">
            <Button size="sm" variant="ghost">+ New Position</Button>
          </Link>
        </div>
        <div className="space-y-3">
          {userPositions.map((pos) => {
            const vault = mockVaults.find((v) => v.id === pos.vaultId);
            const agent = mockAgents.find((a) => a.id === pos.agentId);
            const pnl = pos.currentValue - pos.deposited;
            const pct = ((pnl / pos.deposited) * 100).toFixed(1);
            return (
              <div key={pos.vaultId}
                className="flex items-center gap-4 px-5 py-4 bg-bg-2 border border-border rounded-[10px] cursor-pointer hover:border-border-2 transition-colors"
                onClick={() => router.push(`/vault/${pos.vaultId}`)}>
                <div className="flex-1 min-w-0">
                  <div className="font-display font-semibold text-sm">{pos.vaultName}</div>
                  <div className="text-xs text-abraxas-subtle mt-0.5">
                    {vault?.assetClass} &middot; {agent?.name}
                  </div>
                </div>
                <div className="text-right hidden sm:block">
                  <div className="text-xs text-abraxas-subtle mb-0.5">Deposited</div>
                  <div className="text-sm font-medium">{formatCurrency(pos.deposited)}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-abraxas-subtle mb-0.5">Current Value</div>
                  <div className="font-display font-semibold text-sm">{formatCurrency(pos.currentValue)}</div>
                </div>
                <div className="text-right">
                  <div className="font-display font-semibold text-sm text-abraxas-green">
                    +{pct}%
                  </div>
                  <div className="text-xs text-abraxas-green">{formatCurrency(pnl)}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Agent activity */}
      <AgentFeed />
    </div>
  );
}

export default function DashboardPage() {
  return (
    <WalletGate requireWallet={false}>
      <DashboardContent />
    </WalletGate>
  );
}
