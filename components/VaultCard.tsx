"use client";

import { useRouter } from "next/navigation";
import { Vault } from "@/lib/mockData";
import { PortfolioData, VAULT_YIELD_RATES } from "@/lib/usePortfolioData";
import { formatCurrency, formatNumber } from "@/lib/utils";

const statusColors: Record<string, string> = {
  operating: "var(--green)",
  paused: "#fbbf24",
  graduating: "var(--gold)",
};

interface Props {
  vault: Vault;
  portfolio?: PortfolioData;
}

export function VaultCard({ vault, portfolio }: Props) {
  const router = useRouter();

  const liveTVL = portfolio?.vaultPositions.find((p) => p.vaultId === vault.id)?.tvl ?? vault.tvl;
  const yieldRate = VAULT_YIELD_RATES[vault.id] ?? vault.yieldYTD;

  return (
    <div
      onClick={() => router.push(`/vault/${vault.id}`)}
      style={{
        background: "var(--surface)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: "14px",
        padding: "1.75rem",
        cursor: "pointer",
        transition: "border-color 0.2s, box-shadow 0.2s",
        position: "relative",
        overflow: "hidden",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow = "0 0 30px rgba(200,169,110,0.06)";
        (e.currentTarget as HTMLElement).style.borderColor = "rgba(200,169,110,0.2)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow = "none";
        (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.06)";
      }}
    >
      {/* Top accent line */}
      <div style={{ position: "absolute", top: 0, left: "20%", right: "20%", height: "1px", background: "linear-gradient(90deg, transparent, rgba(200,169,110,0.3), transparent)" }} />

      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "1.5rem" }}>
        <div>
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: "1.05rem", letterSpacing: "0.04em", marginBottom: "0.25rem" }}>
            {vault.name}
          </div>
          <div style={{ fontSize: "0.7rem", color: "var(--subtle)", letterSpacing: "0.04em" }}>{vault.assetClass}</div>
        </div>
        <div style={{
          display: "flex", alignItems: "center", gap: "0.3rem",
          fontSize: "0.6rem", letterSpacing: "0.1em", textTransform: "uppercase",
          color: statusColors[vault.status] ?? "var(--muted)",
          border: `1px solid ${(statusColors[vault.status] ?? "var(--line)")}30`,
          padding: "0.2rem 0.5rem", borderRadius: "4px",
        }}>
          <span style={{
            width: "4px", height: "4px", borderRadius: "50%",
            background: statusColors[vault.status],
            flexShrink: 0,
            ...(vault.status === "operating" ? { animation: "pulse 2s ease-in-out infinite" } : {}),
          }} />
          {vault.status}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "1.5rem" }}>
        {[
          { k: "TVL",      v: formatCurrency(liveTVL) },
          { k: "Yield YTD", v: `${yieldRate}%`, accent: "var(--green)" },
          { k: "Agent",    v: `AGENT-${vault.agentId}`, mono: true },
          { k: "Actions",  v: formatNumber(vault.actionsExecuted) },
        ].map(({ k, v, accent, mono }) => (
          <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem" }}>
            <span style={{ color: "var(--subtle)" }}>{k}</span>
            <span style={{
              color: accent ?? "var(--text)",
              fontFamily: mono ? "'JetBrains Mono', monospace" : "inherit",
              fontSize: mono ? "0.72rem" : undefined,
              fontWeight: accent ? 600 : 500,
            }}>
              {v}
            </span>
          </div>
        ))}
      </div>

      <div style={{ borderTop: "1px solid var(--line)", paddingTop: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: "0.68rem", color: "var(--subtle)" }}>Since {vault.inceptionDate}</span>
        <span style={{ fontSize: "0.68rem", color: "var(--gold)" }}>{vault.defenseEvents} defense events →</span>
      </div>
    </div>
  );
}