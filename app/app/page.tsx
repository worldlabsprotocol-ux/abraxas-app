"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/authState";
import { usePortfolioData } from "@/lib/usePortfolioData";
import { StatCard } from "@/components/StatCard";
import { Button } from "@/components/Button";
import { WalletGate } from "@/components/WalletGate";
import { AgentFeed } from "@/components/AgentFeed";
import { LiveAbraStatus } from "@/components/LiveAbraStatus";
import { LiveBalances } from "@/components/LiveBalances";
import { Heartbeat } from "@/components/Heartbeat";
import { mockVaults, mockAgents } from "@/lib/mockData";
import { formatCurrency } from "@/lib/utils";

const STATUS_POOL = ["operating", "adjusting", "rebalancing", "stable"] as const;
type VStatus = typeof STATUS_POOL[number];

const SC: Record<VStatus, string> = {
  operating: "var(--green)",
  adjusting: "var(--gold)",
  rebalancing: "#6b8cff",
  stable: "var(--subtle)",
};

function useVaultStatus(ms = 12000): VStatus {
  const [s, setS] = useState<VStatus>("operating");
  useEffect(() => {
    const t = setInterval(() => {
      const r = Math.random();
      setS(r < 0.6 ? "operating" : r < 0.8 ? "adjusting" : r < 0.9 ? "rebalancing" : "stable");
    }, ms + Math.random() * 4000);
    return () => clearInterval(t);
  }, [ms]);
  return s;
}

function VaultRow({ pos }: {
  pos: { vaultId: string; vaultName: string; tvl: number; deposited: number; yieldRate: number; annualYield: number; agentId: string };
}) {
  const router = useRouter();
  const vault = mockVaults.find((v) => v.id === pos.vaultId);
  const agent = mockAgents.find((a) => a.id === pos.agentId);
  const status = useVaultStatus(9000 + Math.random() * 5000);
  const pnl = pos.tvl - pos.deposited;
  const pct = pos.deposited > 0 ? ((pnl / pos.deposited) * 100).toFixed(2) : "0.00";

  return (
    <div
      style={{ display: "flex", alignItems: "center", gap: "1rem", padding: "1rem 1.25rem", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "10px", cursor: "pointer", transition: "border-color 0.2s" }}
      onClick={() => router.push(`/vault/${pos.vaultId}`)}
      onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.borderColor = "rgba(200,169,110,0.25)")}
      onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.borderColor = "var(--line)")}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: "0.875rem", marginBottom: "0.2rem" }}>{pos.vaultName}</div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: SC[status], flexShrink: 0, ...(status === "operating" ? { animation: "pulse 2s ease-in-out infinite" } : {}) }} />
          <span style={{ fontSize: "0.68rem", color: SC[status], textTransform: "uppercase", letterSpacing: "0.06em" }}>{status}</span>
          <span style={{ fontSize: "0.68rem", color: "var(--subtle)" }}>· {vault?.assetClass} · {agent?.name} · {pos.yieldRate}% APY</span>
        </div>
      </div>
      <div style={{ textAlign: "right", display: "none" }} className="sm:block">
        <div style={{ fontSize: "0.62rem", color: "var(--subtle)", marginBottom: "0.15rem" }}>Deposited</div>
        <div style={{ fontSize: "0.82rem", fontWeight: 500 }}>{formatCurrency(pos.deposited)}</div>
      </div>
      <div style={{ textAlign: "right" }}>
        <div style={{ fontSize: "0.62rem", color: "var(--subtle)", marginBottom: "0.15rem" }}>TVL</div>
        <div style={{ fontWeight: 700, fontSize: "0.9rem" }}>{formatCurrency(pos.tvl)}</div>
      </div>
      <div style={{ textAlign: "right", minWidth: "3.5rem" }}>
        <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "var(--green)" }}>+{pct}%</div>
        <div style={{ fontSize: "0.7rem", color: "var(--green)" }}>{formatCurrency(pnl)}</div>
      </div>
    </div>
  );
}

function DashboardContent() {
  const router = useRouter();
  const { walletConnected, walletAddress, user } = useAuth();
  const portfolio = usePortfolioData();
  const displayName = user?.name || user?.email || null;

  return (
    <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "2rem 1.5rem" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "2rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <p style={{ fontSize: "0.62rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--subtle)", marginBottom: "0.4rem" }}>
            {displayName ? `Welcome, ${displayName}` : "Operating positions"}
          </p>
          <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: "clamp(1.5rem, 3vw, 2rem)", letterSpacing: "-0.01em" }}>
            Dashboard
          </h1>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.5rem" }}>
          <Heartbeat />
          {user?.email && (
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.7rem", color: "var(--muted)" }}>
              {user.image && <img src={user.image} alt="" style={{ width: "16px", height: "16px", borderRadius: "50%" }} />}
              {user.email}
            </div>
          )}
          {walletConnected && (
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.68rem", color: "var(--gold)", border: "1px solid var(--line)", padding: "0.25rem 0.65rem", borderRadius: "6px", fontFamily: "'JetBrains Mono', monospace" }}>
              <span style={{ width: "4px", height: "4px", borderRadius: "50%", background: "var(--green)", animation: "pulse 2s ease-in-out infinite" }} />
              {walletAddress}
            </div>
          )}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "1.5rem" }}>
        <LiveBalances />
        <LiveAbraStatus />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "0.75rem", marginBottom: "1.5rem" }} className="lg:grid-cols-4">
        <StatCard label="Portfolio Value" value={portfolio.loading ? "…" : formatCurrency(portfolio.portfolioValue)} sub={portfolio.walletValueUSD > 0 ? `${formatCurrency(portfolio.walletValueUSD)} wallet` : "Connect wallet"} subVariant={portfolio.walletValueUSD > 0 ? "positive" : "neutral"} />
        <StatCard label="Yield Generated" value={portfolio.loading ? "…" : formatCurrency(portfolio.yieldGenerated)} sub="Accruing" subVariant="positive" valueColor="var(--green)" />
        <StatCard label="Available Capital" value={portfolio.loading ? "…" : formatCurrency(portfolio.availableCapital)} sub="Liquid" subVariant="neutral" valueColor="var(--gold)" />
        <StatCard label="Active Positions" value={String(portfolio.activePositions)} sub={`${formatCurrency(portfolio.totalVaultTVL)} total TVL`} subVariant="neutral" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "0.75rem", marginBottom: "2rem" }} className="sm:grid-cols-4">
        {[
          { icon: "◈", label: "New Position", href: "/marketplace" },
          { icon: "→", label: "Use Capital", href: "/use" },
          { icon: "▦", label: "Live Feed", href: "/live" },
          { icon: "◉", label: "Formations", href: "/formations" },
        ].map((btn) => (
          <button key={btn.label} onClick={() => router.push(btn.href)}
            style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "10px", padding: "1rem", textAlign: "center", cursor: "pointer", transition: "border-color 0.2s, background 0.2s" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(200,169,110,0.3)"; (e.currentTarget as HTMLElement).style.background = "rgba(200,169,110,0.04)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--line)"; (e.currentTarget as HTMLElement).style.background = "var(--surface)"; }}
          >
            <div style={{ fontSize: "1.1rem", marginBottom: "0.35rem" }}>{btn.icon}</div>
            <span style={{ fontSize: "0.68rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>{btn.label}</span>
          </button>
        ))}
      </div>

      <div style={{ marginBottom: "2rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
          <h2 style={{ fontSize: "0.72rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)" }}>Vault Positions</h2>
          <Link href="/marketplace"><Button size="sm" variant="ghost">+ New Position</Button></Link>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {portfolio.vaultPositions.slice(0, 3).map((pos) => (
            <VaultRow key={pos.vaultId} pos={pos} />
          ))}
        </div>
      </div>

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