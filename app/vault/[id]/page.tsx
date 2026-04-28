"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { mockVaults, mockAgents } from "@/lib/mockData";
import { usePortfolioData, VAULT_YIELD_RATES } from "@/lib/usePortfolioData";
import { AgentFeed } from "@/components/AgentFeed";
import { DefenseFeed } from "@/components/DefenseFeed";
import { Button } from "@/components/Button";
import { useAuth } from "@/lib/authState";
import { VaultLifecycle } from "@/components/VaultLifecycle";
import { formatCurrency, formatNumber } from "@/lib/utils";

function ShareVaultButton({ vaultId, vaultName, yieldRate, tvl }: {
  vaultId: string; vaultName: string; yieldRate: number; tvl: number;
}) {
  const [copied, setCopied] = useState(false);
  const url = typeof window !== "undefined"
    ? `${window.location.origin}/vault/${vaultId}`
    : `https://abraxas.app/vault/${vaultId}`;

  const text = `${vaultName} is operating on Abraxas.\n\n${yieldRate}% APY · ${formatCurrency(tvl)} TVL · Circuit defense active\n\nWatch the agent operate in real time:\n${url}`;

  const shareX = () => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, "_blank");
  const copy = () => {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div style={{ display: "flex", gap: "0.5rem" }}>
      <button
        onClick={shareX}
        style={{
          flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem",
          background: "#000", border: "1px solid rgba(255,255,255,0.15)", color: "#fff",
          borderRadius: "8px", padding: "0.65rem", fontSize: "0.72rem",
          fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, cursor: "pointer",
        }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.747l7.73-8.835L1.254 2.25H8.08l4.259 5.631 5.905-5.631Zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
        Share
      </button>
      <button
        onClick={copy}
        style={{
          flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
          background: "var(--surface)", border: "1px solid var(--line)",
          color: copied ? "var(--green)" : "var(--muted)",
          borderRadius: "8px", padding: "0.65rem", fontSize: "0.72rem",
          fontFamily: "'Space Grotesk', sans-serif", cursor: "pointer",
          transition: "color 0.2s",
        }}
      >
        {copied ? "✓ Copied" : "Copy link"}
      </button>
    </div>
  );
}

const statusColors: Record<string, string> = {
  operating: "rgba(61,214,140,0.12)",
  paused: "rgba(251,191,36,0.12)",
  graduating: "rgba(200,169,110,0.12)",
};
const statusTextColors: Record<string, string> = {
  operating: "var(--green)",
  paused: "#fbbf24",
  graduating: "var(--gold)",
};

// Next.js 14: params is a plain object
export default function VaultPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const router = useRouter();
  const { walletConnected } = useAuth();
  const portfolio = usePortfolioData();

  // Deposit state
  const [depositState, setDepositState] = useState<"idle" | "confirming" | "deposited">("idle");
  const [deposited, setDeposited] = useState(false);

  // Investor toggle
  const [openToInvestors, setOpenToInvestors] = useState(false);

  const vault = mockVaults.find((v) => v.id === id);
  if (!vault) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "8rem 1.5rem", textAlign: "center" }}>
        <p style={{ color: "var(--muted)", marginBottom: "1rem" }}>Vault not found.</p>
        <Button onClick={() => router.push("/marketplace")}>Browse Vaults</Button>
      </div>
    );
  }

  const agent = mockAgents.find((a) => a.id === vault.agentId);

  // Use live TVL from portfolio if available, else fall back to seed value
  const liveTVL = portfolio.vaultPositions.find((p) => p.vaultId === id)?.tvl ?? vault.tvl;
  const yieldRate = VAULT_YIELD_RATES[id] ?? vault.yieldYTD;
  const projectedYield = Math.round(liveTVL * yieldRate / 100);

  const handleDeposit = () => {
    if (!walletConnected) {
      router.push("/login");
      return;
    }
    router.push(`/deposit/${id}`);
  };

  return (
    <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "2rem 1.5rem" }}>
      <button
        onClick={() => router.back()}
        style={{ fontSize: "0.75rem", color: "var(--subtle)", cursor: "pointer", background: "none", border: "none", marginBottom: "1.5rem", display: "inline-flex", alignItems: "center", gap: "0.4rem" }}
      >
        ← Back
      </button>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem", marginBottom: "2rem", flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: "clamp(1.75rem, 4vw, 2.5rem)", letterSpacing: "-0.01em", marginBottom: "0.3rem" }}>
            {vault.name}
          </h1>
          <p style={{ fontSize: "0.8rem", color: "var(--subtle)" }}>{vault.assetClass}</p>
        </div>
        <div style={{
          background: statusColors[vault.status] ?? "var(--surface)",
          color: statusTextColors[vault.status] ?? "var(--muted)",
          padding: "0.2rem 0.65rem",
          borderRadius: "4px",
          fontSize: "0.65rem",
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.1em",
        }}>
          {vault.status}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "1.5rem" }} className="lg:grid-cols-[1fr_300px]">

        {/* Left */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "14px", padding: "1.75rem" }}>
            <p style={{ fontSize: "0.875rem", color: "var(--muted)", lineHeight: 1.7, marginBottom: "1.75rem" }}>
              {vault.description}
            </p>
            <div>
              {[
                { label: "TVL", value: formatCurrency(liveTVL), color: "var(--text)" },
                { label: "Yield YTD", value: `${yieldRate}%`, color: "var(--green)" },
                { label: "Projected Annual Yield", value: formatCurrency(projectedYield), color: "var(--green)" },
                { label: "Inception Date", value: vault.inceptionDate, color: "var(--text)" },
                { label: "Agent", value: `AGENT-${vault.agentId}`, mono: true, color: "var(--gold)" },
                { label: "Actions Executed", value: formatNumber(vault.actionsExecuted), color: "var(--text)" },
                { label: "Defense Events", value: String(vault.defenseEvents), color: "var(--text)" },
                { label: "Unrecovered Positions", value: "0", color: "var(--green)" },
              ].map(({ label, value, color, mono }) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "0.75rem 0", borderBottom: "1px solid var(--line)" }}>
                  <span style={{ fontSize: "0.82rem", color: "var(--subtle)" }}>{label}</span>
                  <span style={{ fontSize: "0.82rem", fontWeight: 500, color, fontFamily: mono ? "'JetBrains Mono', monospace" : "inherit" }}>{value}</span>
                </div>
              ))}
            </div>
          </div>

          {agent && (
            <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "14px", padding: "1.5rem" }}>
              <p style={{ fontSize: "0.62rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--subtle)", marginBottom: "1rem" }}>Assigned Agent</p>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: "1rem", color: "var(--gold)" }}>{agent.name}</span>
                <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.72rem", color: "var(--green)" }}>
                  <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: "var(--green)", animation: "pulse 2s ease-in-out infinite" }} />
                  {agent.status}
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", fontSize: "0.82rem" }}>
                <div>
                  <div style={{ color: "var(--subtle)", fontSize: "0.68rem", marginBottom: "0.2rem" }}>Uptime</div>
                  <div style={{ fontWeight: 500 }}>{agent.uptimePct}%</div>
                </div>
                <div>
                  <div style={{ color: "var(--subtle)", fontSize: "0.68rem", marginBottom: "0.2rem" }}>Actions</div>
                  <div style={{ fontWeight: 500 }}>{formatNumber(agent.actionsExecuted)}</div>
                </div>
              </div>
            </div>
          )}

          <AgentFeed />
          <DefenseFeed limit={3} />
        </div>

        {/* Right — actions */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>

          {/* Vault lifecycle — plain language status */}
          <VaultLifecycle vault={vault} />

          {/* Deposit */}
          <button
            onClick={handleDeposit}
            disabled={depositState === "confirming"}
            style={{
              background: deposited ? "rgba(61,214,140,0.08)" : "var(--gold)",
              color: deposited ? "var(--green)" : "var(--void)",
              border: deposited ? "1px solid rgba(61,214,140,0.3)" : "none",
              borderRadius: "8px",
              padding: "0.875rem",
              fontFamily: "'Space Grotesk', sans-serif",
              fontWeight: 700,
              fontSize: "0.78rem",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              cursor: depositState === "confirming" ? "wait" : "pointer",
              transition: "all 0.3s",
              width: "100%",
            }}
          >
            {depositState === "confirming"
              ? "Confirming…"
              : depositState === "deposited"
              ? "✓ Deposited"
              : "Deposit to Vault"}
          </button>

          {/* Open to Investors toggle */}
          <button
            onClick={() => setOpenToInvestors((v) => !v)}
            style={{
              background: openToInvestors ? "rgba(107,140,255,0.08)" : "var(--surface)",
              border: `1px solid ${openToInvestors ? "rgba(107,140,255,0.35)" : "var(--line)"}`,
              color: openToInvestors ? "#6b8cff" : "var(--text)",
              borderRadius: "8px",
              padding: "0.875rem",
              fontFamily: "'Space Grotesk', sans-serif",
              fontWeight: 600,
              fontSize: "0.78rem",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              cursor: "pointer",
              transition: "all 0.2s",
              width: "100%",
            }}
          >
            {openToInvestors ? "✓ Open to Investors" : "Open to Investors"}
          </button>

          <Button fullWidth size="lg" variant="secondary" onClick={() => router.push("/defense")}>
            View Defense Log
          </Button>

          {/* Share this vault */}
          <ShareVaultButton vaultId={id} vaultName={vault.name} yieldRate={yieldRate} tvl={liveTVL} />

          {/* ── THREE LIVE ACTIONS ── */}
          <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "12px", overflow: "hidden" }}>
            <div style={{ padding: "0.75rem 1rem", borderBottom: "1px solid var(--line)", background: "var(--raise)" }}>
              <p style={{ fontSize: "0.6rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--subtle)" }}>Vault Actions</p>
            </div>
            {[
              {
                icon: "↓", label: "Deploy Capital",
                desc: "Add capital to this vault position",
                action: () => router.push(`/deposit/${id}`),
                color: "var(--gold)", bg: "rgba(200,169,110,0.06)",
              },
              {
                icon: "⬡", label: "Attract Capital",
                desc: openToInvestors ? "Open to investors — sharing enabled" : "Open vault to outside investors",
                action: () => setOpenToInvestors((v) => !v),
                color: openToInvestors ? "#6b8cff" : "var(--text)",
                bg: openToInvestors ? "rgba(107,140,255,0.06)" : "transparent",
                active: openToInvestors,
              },
              {
                icon: "→", label: "Sell Asset Position",
                desc: "Transfer or exit your vault position",
                action: () => router.push("/use"),
                color: "var(--text)", bg: "transparent",
              },
            ].map((item, i, arr) => (
              <div
                key={item.label}
                onClick={item.action}
                style={{
                  padding: "0.875rem 1rem",
                  display: "flex", alignItems: "center", gap: "0.875rem",
                  cursor: "pointer", background: item.bg,
                  borderBottom: i < arr.length - 1 ? "1px solid var(--line)" : "none",
                  transition: "background 0.2s",
                }}
                onMouseEnter={(e) => { if (!item.bg) (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.02)"; }}
                onMouseLeave={(e) => { if (!item.bg) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
              >
                <div style={{ width: "30px", height: "30px", borderRadius: "6px", background: "rgba(255,255,255,0.04)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.875rem", flexShrink: 0, color: item.color }}>
                  {item.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "0.8rem", fontWeight: 600, color: item.color, marginBottom: "0.15rem" }}>{item.label}</div>
                  <div style={{ fontSize: "0.68rem", color: "var(--subtle)", lineHeight: 1.4 }}>{item.desc}</div>
                </div>
                <span style={{ color: "var(--subtle)", fontSize: "0.75rem" }}>→</span>
              </div>
            ))}
          </div>

          {/* Yield card — derived */}
          <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "10px", padding: "1.25rem" }}>
            <p style={{ fontSize: "0.62rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--subtle)", marginBottom: "0.4rem" }}>
              Projected Annual Yield
            </p>
            <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: "1.5rem", color: "var(--green)" }}>
              {formatCurrency(projectedYield)}
            </p>
            <p style={{ fontSize: "0.7rem", color: "var(--subtle)", marginTop: "0.2rem" }}>
              Based on {yieldRate}% rate · {formatCurrency(liveTVL)} TVL
            </p>
          </div>

          {/* Defense card */}
          <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "10px", padding: "1.25rem" }}>
            <p style={{ fontSize: "0.62rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--subtle)", marginBottom: "0.4rem" }}>
              Circuit Defense
            </p>
            <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: "1.25rem", color: "var(--gold)" }}>
              {vault.defenseEvents} events
            </p>
            <p style={{ fontSize: "0.7rem", color: "var(--green)", marginTop: "0.2rem" }}>$0 unrecovered</p>
          </div>
        </div>
      </div>
    </div>
  );
}