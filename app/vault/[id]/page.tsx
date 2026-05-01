// FILE: app/vault/[id]/page.tsx
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { VAULTS, fmtUSD } from "@/lib/appData";
import { LiveFeed } from "@/components/LiveFeed";

const LIFECYCLE = [
  { key: "register", label: "Register",  desc: "Asset onboarded · proof verified"     },
  { key: "activate", label: "Activate",  desc: "Agent assigned · vault wallet funded" },
  { key: "operate",  label: "Operate",   desc: "Compounding · defending continuously" },
];

export default function VaultDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const v = VAULTS.find((x) => x.id === params.id);

  if (!v) {
    return (
      <div style={{ maxWidth: "480px", margin: "0 auto", padding: "4rem 1.25rem", textAlign: "center" }}>
        <p style={{ color: "var(--muted)", marginBottom: "1rem" }}>Vault not found.</p>
        <Link href="/marketplace" style={{ color: "var(--gold)" }}>Browse vaults →</Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "780px", margin: "0 auto", padding: "2.5rem 1.25rem 4rem" }}>
      <button
        onClick={() => router.back()}
        style={{ background: "none", border: "none", color: "var(--subtle)", fontSize: "0.75rem", cursor: "pointer", marginBottom: "1.25rem" }}>
        ← Back
      </button>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
        <div>
          <p style={{ fontSize: "0.6rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--subtle)", marginBottom: "0.4rem" }}>Vault</p>
          <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 800, fontSize: "clamp(1.75rem, 5vw, 2.4rem)", letterSpacing: "-0.02em", marginBottom: "0.4rem" }}>
            {v.name}
          </h1>
          <p style={{ fontSize: "0.85rem", color: "var(--muted)" }}>{v.asset} · {v.agent}</p>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontWeight: 800, fontSize: "1.8rem", color: "var(--green)" }}>{v.apy}%</div>
          <div style={{ fontSize: "0.62rem", color: "var(--subtle)", textTransform: "uppercase", letterSpacing: "0.08em" }}>APY</div>
        </div>
      </div>

      {/* Stats grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "0.625rem", marginBottom: "1.5rem" }}>
        {[
          { k: "TVL",        v: fmtUSD(v.tvl)             },
          { k: "Inception",  v: v.inceptionDate           },
          { k: "Status",     v: v.status, green: v.status === "operating" },
          { k: "Unrecovered",v: "$0",     green: true     },
        ].map((s) => (
          <div key={s.k} style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "10px", padding: "0.875rem 1rem" }}>
            <div style={{ fontSize: "0.58rem", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--subtle)", marginBottom: "0.25rem" }}>{s.k}</div>
            <div style={{ fontWeight: 700, fontSize: "0.9rem", color: s.green ? "var(--green)" : "var(--text)", textTransform: s.k === "Status" ? "capitalize" : "none" }}>{s.v}</div>
          </div>
        ))}
      </div>

      {/* Lifecycle */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "12px", padding: "1.25rem", marginBottom: "1rem" }}>
        <p style={{ fontSize: "0.6rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--subtle)", marginBottom: "0.875rem" }}>Lifecycle</p>
        {LIFECYCLE.map((s, i) => (
          <div key={s.key} style={{ display: "flex", gap: "0.75rem", padding: "0.5rem 0" }}>
            <div style={{ width: "20px", height: "20px", borderRadius: "50%", background: "var(--green)", color: "var(--void)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.6rem", fontWeight: 700, flexShrink: 0 }}>✓</div>
            <div>
              <div style={{ fontWeight: 600, fontSize: "0.82rem" }}>{s.label}</div>
              <div style={{ fontSize: "0.7rem", color: "var(--muted)" }}>{s.desc}</div>
            </div>
          </div>
        ))}
      </div>

      {/* On-chain proof */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "12px", padding: "1rem 1.25rem", marginBottom: "1.5rem" }}>
        <p style={{ fontSize: "0.6rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--subtle)", marginBottom: "0.5rem" }}>Vault wallet</p>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.7rem", color: "var(--gold)", wordBreak: "break-all", marginBottom: "0.5rem" }}>
          {v.walletAddress}
        </div>
        <a href={v.solscanUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: "0.72rem", color: "var(--gold)", textDecoration: "none" }}>
          View on Solscan ↗
        </a>
      </div>

      {/* Deploy CTA */}
      <Link href={`/deposit/${v.id}`} style={{ textDecoration: "none" }}>
        <button style={{ width: "100%", background: "var(--gold)", color: "var(--void)", border: "none", borderRadius: "10px", padding: "1rem", fontWeight: 700, fontSize: "0.95rem", cursor: "pointer", marginBottom: "2rem" }}>
          Deploy Capital →
        </button>
      </Link>

      {/* Live activity for this vault */}
      <p style={{ fontSize: "0.6rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--subtle)", marginBottom: "0.75rem" }}>Recent activity</p>
      <LiveFeed limit={8} showHeader={false} />
    </div>
  );
}