"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/authState";
import { StatCard } from "@/components/StatCard";
import { Button } from "@/components/Button";
import { WalletGate } from "@/components/WalletGate";
import { AgentFeed } from "@/components/AgentFeed";
import { LiveAbraStatus } from "@/components/LiveAbraStatus";
import { LiveBalances } from "@/components/LiveBalances";
import { Heartbeat } from "@/components/Heartbeat";
import { userStats, userPositions, mockVaults, mockAgents } from "@/lib/mockData";
import { formatCurrency, formatNumber } from "@/lib/utils";

// Slowly drifts a value ±noise every intervalMs to feel alive
function useDriftingValue(base: number, noise: number, intervalMs = 7000) {
  const [val, setVal] = useState(base);
  useEffect(() => {
    const t = setInterval(() => {
      const delta = (Math.random() * 2 - 1) * noise;
      setVal(base + delta);
    }, intervalMs);
    return () => clearInterval(t);
  }, [base, noise, intervalMs]);
  return val;
}

// Vault status cycles subtly
const VAULT_STATUS_POOL = ["operating", "adjusting", "rebalancing", "stable"] as const;
type VaultStatusLabel = (typeof VAULT_STATUS_POOL)[number];

function useVaultStatus(initial: VaultStatusLabel, intervalMs = 12000): VaultStatusLabel {
  const [status, setStatus] = useState<VaultStatusLabel>(initial);
  useEffect(() => {
    const t = setInterval(() => {
      // Mostly stays "operating", occasionally shows "adjusting"
      const roll = Math.random();
      if (roll < 0.6) setStatus("operating");
      else if (roll < 0.8) setStatus("adjusting");
      else if (roll < 0.9) setStatus("rebalancing");
      else setStatus("stable");
    }, intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return status;
}

const statusColor: Record<VaultStatusLabel, string> = {
  operating: "var(--green)",
  adjusting: "var(--gold)",
  rebalancing: "#6b8cff",
  stable: "var(--subtle)",
};

function VaultRow({ pos }: { pos: (typeof userPositions)[0] }) {
  const router = useRouter();
  const vault = mockVaults.find((v) => v.id === pos.vaultId);
  const agent = mockAgents.find((a) => a.id === pos.agentId);
  const statusLabel = useVaultStatus("operating", 9000 + Math.random() * 6000);
  const driftedValue = useDriftingValue(pos.currentValue, pos.currentValue * 0.0008, 8000);

  const pnl = driftedValue - pos.deposited;
  const pct = ((pnl / pos.deposited) * 100).toFixed(2);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "1rem",
        padding: "1rem 1.25rem",
        background: "var(--surface)",
        border: "1px solid var(--line)",
        borderRadius: "10px",
        cursor: "pointer",
        transition: "border-color 0.2s",
      }}
      onClick={() => router.push(`/vault/${pos.vaultId}`)}
      onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.borderColor = "rgba(200,169,110,0.25)")}
      onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.borderColor = "var(--line)")}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: "0.875rem", marginBottom: "0.2rem" }}>{pos.vaultName}</div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{
            width: "5px", height: "5px", borderRadius: "50%",
            background: statusColor[statusLabel],
            flexShrink: 0,
            ...(statusLabel === "operating" ? { animation: "pulse 2s ease-in-out infinite" } : {}),
          }} />
          <span style={{ fontSize: "0.7rem", color: statusColor[statusLabel], textTransform: "uppercase", letterSpacing: "0.06em" }}>
            {statusLabel}
          </span>
          <span style={{ fontSize: "0.7rem", color: "var(--subtle)" }}>
            · {vault?.assetClass} · {agent?.name}
          </span>
        </div>
      </div>

      <div style={{ textAlign: "right", display: "none" }} className="sm:block">
        <div style={{ fontSize: "0.65rem", color: "var(--subtle)", marginBottom: "0.15rem" }}>Deposited</div>
        <div style={{ fontSize: "0.85rem", fontWeight: 500 }}>{formatCurrency(pos.deposited)}</div>
      </div>

      <div style={{ textAlign: "right" }}>
        <div style={{ fontSize: "0.65rem", color: "var(--subtle)", marginBottom: "0.15rem" }}>Current Value</div>
        <div style={{ fontWeight: 700, fontSize: "0.9rem", transition: "color 0.5s" }}>
          {formatCurrency(Math.round(driftedValue))}
        </div>
      </div>

      <div style={{ textAlign: "right", minWidth: "3.5rem" }}>
        <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "var(--green)" }}>+{pct}%</div>
        <div style={{ fontSize: "0.72rem", color: "var(--green)" }}>{formatCurrency(Math.round(pnl))}</div>
      </div>
    </div>
  );
}

function DashboardContent() {
  const router = useRouter();
  const { walletConnected, walletAddress, user } = useAuth();
  const yieldVal = useDriftingValue(userStats.yieldGenerated, 18, 9000);
  const capitalVal = useDriftingValue(userStats.availableCapital, 12, 11000);

  const displayName = user?.name || user?.email || null;

  return (
    <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "2rem 1.5rem" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "2rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <p style={{ fontSize: "0.65rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--subtle)", marginBottom: "0.4rem" }}>
            {displayName ? `Welcome, ${displayName}` : "Operating positions"}
          </p>
          <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: "clamp(1.5rem, 3vw, 2rem)", letterSpacing: "-0.01em" }}>
            Dashboard
          </h1>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.5rem" }}>
          <Heartbeat />
          {user?.email && (
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.72rem", color: "var(--muted)" }}>
              {user.image && <img src={user.image} alt="" style={{ width: "18px", height: "18px", borderRadius: "50%" }} />}
              <span>{user.email}</span>
            </div>
          )}
          {walletConnected && (
            <div style={{
              display: "flex", alignItems: "center", gap: "0.5rem",
              fontSize: "0.7rem", color: "var(--gold)",
              border: "1px solid rgba(255,255,255,0.1)",
              padding: "0.3rem 0.75rem", borderRadius: "6px",
              fontFamily: "'JetBrains Mono', monospace",
            }}>
              <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: "var(--green)", animation: "pulse 2s ease-in-out infinite" }} />
              {walletAddress}
            </div>
          )}
        </div>
      </div>

      {/* Live balances + ABRA status */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "1.5rem" }} className="lg:grid-cols-2">
        <LiveBalances />
        <LiveAbraStatus />
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "0.75rem", marginBottom: "1.5rem" }} className="lg:grid-cols-4">
        <StatCard
          label="Portfolio Value"
          value={formatCurrency(userStats.currentValue)}
          sub={`+${formatCurrency(userStats.currentValue - userStats.totalDeposited)} total`}
          subVariant="positive"
        />
        <StatCard
          label="Yield Generated"
          value={formatCurrency(Math.round(yieldVal))}
          sub="Accruing"
          subVariant="positive"
          valueColor="var(--green)"
        />
        <StatCard
          label="Available Capital"
          value={formatCurrency(Math.round(capitalVal))}
          sub="Ready to deploy"
          subVariant="neutral"
          valueColor="var(--gold)"
        />
        <StatCard
          label="Active Positions"
          value={String(userStats.activePositions)}
          sub="Across 3 vaults"
          subVariant="neutral"
        />
      </div>

      {/* Quick actions — all navigate */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "0.75rem", marginBottom: "2rem" }} className="sm:grid-cols-4">
        {[
          { icon: "◈", label: "New Position", href: "/marketplace" },
          { icon: "→", label: "Use Capital", href: "/use" },
          { icon: "▦", label: "Live Feed", href: "/live" },
          { icon: "◉", label: "Formations", href: "/formations" },
        ].map((btn) => (
          <button
            key={btn.label}
            onClick={() => router.push(btn.href)}
            style={{
              background: "var(--surface)",
              border: "1px solid var(--line)",
              borderRadius: "10px",
              padding: "1rem",
              textAlign: "center",
              cursor: "pointer",
              transition: "border-color 0.2s, background 0.2s",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = "rgba(200,169,110,0.3)";
              (e.currentTarget as HTMLElement).style.background = "rgba(200,169,110,0.04)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = "var(--line)";
              (e.currentTarget as HTMLElement).style.background = "var(--surface)";
            }}
          >
            <div style={{ fontSize: "1.1rem", marginBottom: "0.4rem" }}>{btn.icon}</div>
            <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "0.7rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              {btn.label}
            </span>
          </button>
        ))}
      </div>

      {/* Vault positions */}
      <div style={{ marginBottom: "2rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
          <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: "0.875rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)" }}>
            Vault Positions
          </h2>
          <Link href="/marketplace">
            <Button size="sm" variant="ghost">+ New Position</Button>
          </Link>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {userPositions.map((pos) => <VaultRow key={pos.vaultId} pos={pos} />)}
        </div>
      </div>

      {/* Agent feed */}
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