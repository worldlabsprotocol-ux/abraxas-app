"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { mockVaults } from "@/lib/mockData";
import { VAULT_YIELD_RATES } from "@/lib/usePortfolioData";
import { formatCurrency } from "@/lib/utils";

/**
 * /demo. read-only dashboard for prospect evaluation.
 * No wallet required. Shows what a real operator dashboard looks like.
 * Per Mrityunjay: "serious evaluators can't see beyond the marketing surface."
 */

const DEMO_POSITIONS = [
  { vault: mockVaults[0], deposited: 5000,  earned: 641,  daysActive: 76 },
  { vault: mockVaults[1], deposited: 2500,  earned: 284,  daysActive: 68 },
];

export default function DemoPage() {
  const router = useRouter();
  const totalDeposited = DEMO_POSITIONS.reduce((s, p) => s + p.deposited, 0);
  const totalEarned    = DEMO_POSITIONS.reduce((s, p) => s + p.earned, 0);

  return (
    <div style={{ maxWidth: "900px", margin: "0 auto", padding: "2.5rem 1.25rem 5rem" }}>
      {/* Demo banner */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.75rem 1.25rem", background: "rgba(200,169,110,0.08)", border: "1px solid rgba(200,169,110,0.25)", borderRadius: "10px", marginBottom: "2rem", flexWrap: "wrap", gap: "0.75rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ fontSize: "0.72rem", color: "var(--gold)", fontWeight: 600 }}>◈ Demo Mode</span>
          <span style={{ fontSize: "0.72rem", color: "var(--muted)" }}>- illustrative positions, real vault data, no wallet required</span>
        </div>
        <button onClick={() => router.push("/app")} style={{ background: "var(--gold)", color: "var(--void)", border: "none", borderRadius: "6px", padding: "0.35rem 0.875rem", fontSize: "0.72rem", fontWeight: 700, cursor: "pointer", fontFamily: "'Space Grotesk', sans-serif" }}>
          Connect Wallet →
        </button>
      </div>

      <div style={{ marginBottom: "2rem" }}>
        <p style={{ fontSize: "0.62rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--subtle)", marginBottom: "0.4rem" }}>Operator Dashboard. Demo</p>
        <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: "1.75rem", letterSpacing: "-0.01em" }}>
          What your dashboard looks like.
        </h1>
      </div>

      {/* Summary stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "0.875rem", marginBottom: "2rem" }}>
        {[
          { label: "Total Deposited",   value: formatCurrency(totalDeposited),       sub: "across 2 vaults"       },
          { label: "Total Earned",      value: formatCurrency(totalEarned),           sub: "since inception",      green: true },
          { label: "Active Positions",  value: "2",                                  sub: "vaults operating"      },
          { label: "Avg APY",           value: "12.1%",                              sub: "weighted average",     green: true },
        ].map((s) => (
          <div key={s.label} style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "12px", padding: "1rem 1.25rem" }}>
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: "1.2rem", color: s.green ? "var(--green)" : "var(--text)", marginBottom: "0.2rem" }}>{s.value}</div>
            <div style={{ fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--subtle)" }}>{s.label}</div>
            <div style={{ fontSize: "0.65rem", color: "var(--subtle)", marginTop: "0.1rem" }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Positions */}
      <div style={{ marginBottom: "2rem" }}>
        <p style={{ fontSize: "0.62rem", letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--subtle)", marginBottom: "0.875rem" }}>Active Positions</p>
        {DEMO_POSITIONS.map((pos) => {
          const apy     = VAULT_YIELD_RATES[pos.vault.id] ?? 9;
          const monthly = Math.round(pos.deposited * apy / 100 / 12);
          return (
            <div key={pos.vault.id} style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "12px", padding: "1.25rem 1.5rem", marginBottom: "0.75rem" }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "0.875rem", flexWrap: "wrap", gap: "0.5rem" }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: "0.9rem", marginBottom: "0.15rem" }}>{pos.vault.name}</div>
                  <div style={{ fontSize: "0.68rem", color: "var(--subtle)" }}>{pos.vault.assetClass} · AGENT-{pos.vault.agentId}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontWeight: 700, fontSize: "1.1rem", color: "var(--green)" }}>{apy}%</div>
                  <div style={{ fontSize: "0.6rem", color: "var(--subtle)" }}>APY</div>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", gap: "0.75rem", marginBottom: "0.875rem" }}>
                {[
                  { k: "Deposited",  v: formatCurrency(pos.deposited) },
                  { k: "Earned",     v: formatCurrency(pos.earned), green: true },
                  { k: "Monthly",    v: `~${formatCurrency(monthly)}`, green: true },
                  { k: "Active for", v: `${pos.daysActive} days` },
                ].map((row) => (
                  <div key={row.k}>
                    <div style={{ fontSize: "0.6rem", color: "var(--subtle)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.2rem" }}>{row.k}</div>
                    <div style={{ fontWeight: 600, fontSize: "0.875rem", color: (row as any).green ? "var(--green)" : "var(--text)" }}>{row.v}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "0.75rem", borderTop: "1px solid var(--line)", flexWrap: "wrap", gap: "0.5rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                  <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: "var(--green)", animation: "pulse 2s ease-in-out infinite" }} />
                  <span style={{ fontSize: "0.68rem", color: "var(--green)", fontWeight: 600 }}>Operating</span>
                </div>
                <a href={pos.vault.solscanUrl} target="_blank" rel="noopener noreferrer"
                  style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.62rem", color: "var(--gold)", textDecoration: "none" }}>
                  {pos.vault.shortAddress} ↗
                </a>
              </div>
            </div>
          );
        })}
      </div>

      {/* CTA */}
      <div style={{ textAlign: "center", padding: "2.5rem", background: "var(--surface)", border: "1px solid rgba(200,169,110,0.2)", borderRadius: "14px" }}>
        <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: "1.25rem", marginBottom: "0.625rem" }}>Ready to operate?</h2>
        <p style={{ fontSize: "0.82rem", color: "var(--muted)", marginBottom: "1.5rem" }}>Connect your wallet to see your real positions, deposit to a vault, and activate an agent.</p>
        <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/app"><div style={{ background: "var(--gold)", color: "var(--void)", borderRadius: "8px", padding: "0.75rem 1.75rem", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: "0.875rem", cursor: "pointer" }}>Connect Wallet →</div></Link>
          <Link href="/earn"><div style={{ background: "transparent", color: "var(--text)", border: "1px solid var(--line)", borderRadius: "8px", padding: "0.75rem 1.75rem", fontFamily: "'Space Grotesk', sans-serif", fontSize: "0.875rem", cursor: "pointer" }}>Just Earn Yield</div></Link>
        </div>
      </div>
    </div>
  );
}