// FILE: app/page.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TOTAL_AUM, ACTIVE_VAULTS, ASSET_TYPES, NFT_COLLECTIONS, NFTCollection, fmtUSD } from "@/lib/appData";
import { LiveFeed } from "@/components/LiveFeed";

function NFTSection() {
  const [chain, setChain] = useState<"SOL" | "ETH" | "IP">("SOL");
  const router = useRouter();
  const filtered = NFT_COLLECTIONS.filter((c) => c.chain === chain);
  const tabs = [{ key: "SOL" as const, label: "Solana" }, { key: "ETH" as const, label: "Ethereum" }, { key: "IP" as const, label: "IP / RWA" }];

  return (
    <section style={{ maxWidth: "1000px", margin: "0 auto", padding: "0 1.25rem 3rem" }}>
      <div style={{ marginBottom: "1.25rem" }}>
        <p style={{ fontSize: "0.6rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--subtle)", marginBottom: "0.4rem" }}>Signal layer</p>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
          <div>
            <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 800, fontSize: "1.2rem", letterSpacing: "-0.01em", marginBottom: "0.2rem" }}>NFT collections</h2>
            <p style={{ fontSize: "0.72rem", color: "var(--muted)" }}>Collections generate signals → vaults deploy capital → yield is produced</p>
          </div>
          <div style={{ display: "flex", gap: "0.4rem" }}>
            {tabs.map((t) => (
              <button key={t.key} onClick={() => setChain(t.key)} style={{ background: chain === t.key ? "rgba(200,169,110,0.12)" : "var(--surface)", border: `1px solid ${chain === t.key ? "var(--gold)" : "var(--line)"}`, color: chain === t.key ? "var(--gold)" : "var(--muted)", borderRadius: "6px", padding: "0.3rem 0.7rem", fontSize: "0.68rem", fontWeight: 600, cursor: "pointer", fontFamily: "'Space Grotesk', sans-serif" }}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "10px", overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 80px 90px 62px 1fr", gap: "0.5rem", padding: "0.5rem 1rem", borderBottom: "1px solid var(--line)" }}>
          {["Collection","Floor","Volume","Chg","Signal"].map((h) => <span key={h} style={{ fontSize: "0.58rem", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--subtle)" }}>{h}</span>)}
        </div>
        {filtered.map((c: NFTCollection) => (
          <div key={c.name} onClick={() => router.push(`/deposit/${c.vaultId}`)} style={{ display: "grid", gridTemplateColumns: "1fr 80px 90px 62px 1fr", gap: "0.5rem", alignItems: "center", padding: "0.55rem 1rem", borderBottom: "1px solid rgba(255,255,255,0.03)", cursor: "pointer" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.02)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
            <span style={{ fontSize: "0.82rem", fontWeight: 600 }}>{c.name}</span>
            <span style={{ fontSize: "0.72rem", color: "var(--muted)", fontFamily: "'JetBrains Mono', monospace" }}>{c.floor}</span>
            <span style={{ fontSize: "0.72rem", color: "var(--muted)", fontFamily: "'JetBrains Mono', monospace" }}>{c.volume}</span>
            <span style={{ fontSize: "0.72rem", fontWeight: 600, fontFamily: "'JetBrains Mono', monospace", color: c.positive ? "var(--green)" : "#f26b6b" }}>{c.change}</span>
            <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
              <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: c.positive ? "var(--green)" : "var(--subtle)", flexShrink: 0 }} />
              <span style={{ fontSize: "0.65rem", color: "var(--muted)" }}>{c.signal}</span>
            </div>
          </div>
        ))}
        <div style={{ padding: "0.6rem 1rem", borderTop: "1px solid var(--line)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: "0.6rem", color: "var(--subtle)" }}>Reference feed based on {chain === "SOL" ? "Magic Eden" : chain === "ETH" ? "Blur" : "Protocol"} style data · Live API integration pending</span>
          <Link href="/operate" style={{ fontSize: "0.7rem", color: "var(--gold)", textDecoration: "none", fontWeight: 600 }}>Deploy capital →</Link>
        </div>
      </div>
    </section>
  );
}

const SIGNALS = [
  { artist: "Bad Bunny",     signal: "High streaming velocity", stat: "+18% 7d",       live: true  },
  { artist: "Taylor Swift",  signal: "Sync licensing active",   stat: "12 placements", live: true  },
  { artist: "Drake",         signal: "Catalog volume spike",    stat: "+9.4% 30d",     live: false },
  { artist: "Billie Eilish", signal: "PRO registrations +3",   stat: "New catalogs",  live: true  },
  { artist: "Travis Scott",  signal: "Distribution velocity",   stat: "+22% 7d",       live: true  },
  { artist: "SZA",           signal: "Royalty cycle 2x speed", stat: "Accelerating",  live: false },
];

export default function HomePage() {
  return (
    <div style={{ background: "var(--void)", minHeight: "100vh" }}>
      {/* HERO */}
      <section style={{ maxWidth: "700px", margin: "0 auto", padding: "5rem 1.25rem 3.5rem", textAlign: "center" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", background: "rgba(61,214,140,0.08)", border: "1px solid rgba(61,214,140,0.2)", borderRadius: "100px", padding: "0.3rem 0.75rem", marginBottom: "1.75rem" }}>
          <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: "var(--green)", animation: "pulse 2s ease-in-out infinite" }} />
          <span style={{ fontSize: "0.62rem", color: "var(--green)", fontWeight: 600 }}>{ACTIVE_VAULTS} vaults live · {fmtUSD(TOTAL_AUM)} operating</span>
        </div>
        <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 800, fontSize: "clamp(2.1rem, 7vw, 4rem)", lineHeight: 1.05, letterSpacing: "-0.025em", marginBottom: "1rem" }}>
          Turn real assets into yield.
        </h1>
        <p style={{ fontSize: "1rem", color: "var(--muted)", maxWidth: "460px", margin: "0 auto 0.75rem", lineHeight: 1.6 }}>
          Deploy capital into vaults and earn. Music royalties, real estate, receivables — all operating on Solana.
        </p>
        <p style={{ fontSize: "0.8rem", color: "var(--subtle)", marginBottom: "2rem" }}>
          Pick an asset → customize → deposit → earn. ABRAP position token minted to your wallet.
        </p>
        <Link href="/operate" style={{ textDecoration: "none" }}>
          <div style={{ display: "inline-block", background: "var(--gold)", color: "var(--void)", borderRadius: "10px", padding: "1rem 2.5rem", fontWeight: 800, fontSize: "1rem", cursor: "pointer", boxShadow: "0 4px 24px rgba(200,169,110,0.28)", fontFamily: "'Space Grotesk', sans-serif" }}>
            Start Operating →
          </div>
        </Link>
      </section>

      {/* STATS */}
      <section style={{ borderTop: "1px solid var(--line)", borderBottom: "1px solid var(--line)", background: "rgba(255,255,255,0.01)", padding: "1.25rem" }}>
        <div style={{ maxWidth: "900px", margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem", textAlign: "center" }}>
          {[
            { v: fmtUSD(TOTAL_AUM), k: "Total AUM",      link: "/methodology" },
            { v: String(ACTIVE_VAULTS), k: "Active Vaults", link: "/operate" },
            { v: "$0",              k: "Unrecovered",    link: "/methodology", green: true },
            { v: "5",               k: "Agents Online",  link: "/operate" },
          ].map((s) => (
            <Link key={s.k} href={s.link} style={{ textDecoration: "none" }}>
              <div style={{ fontWeight: 700, fontSize: "1.3rem", color: (s as {green?:boolean}).green ? "var(--green)" : "var(--text)" }}>{s.v}</div>
              <div style={{ fontSize: "0.6rem", color: "var(--subtle)", letterSpacing: "0.1em", textTransform: "uppercase", marginTop: "4px" }}>{s.k}</div>
            </Link>
          ))}
        </div>
      </section>

      {/* ASSET GRID */}
      <section style={{ maxWidth: "1000px", margin: "0 auto", padding: "3rem 1.25rem 2rem" }}>
        <p style={{ fontSize: "0.6rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--subtle)", marginBottom: "0.875rem" }}>What you can operate</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(185px, 1fr))", gap: "0.625rem" }}>
          {ASSET_TYPES.map((a) => (
            <Link key={a.key} href={`/operate?type=${a.key}`} style={{ textDecoration: "none" }}>
              <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "12px", padding: "1.1rem", cursor: "pointer", height: "100%", boxSizing: "border-box" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                  <span style={{ fontSize: "1.3rem" }}>{a.icon}</span>
                  <span style={{ fontWeight: 800, fontSize: "1rem", color: "var(--green)" }}>{a.apy}%</span>
                </div>
                <div style={{ fontWeight: 700, fontSize: "0.875rem", marginBottom: "0.3rem" }}>{a.name}</div>
                <p style={{ fontSize: "0.7rem", color: "var(--muted)", lineHeight: 1.5 }}>{a.howItEarns}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* NFT COLLECTIONS */}
      <NFTSection />

      {/* MARKET SIGNALS */}
      <section style={{ maxWidth: "1000px", margin: "0 auto", padding: "0 1.25rem 3rem" }}>
        <p style={{ fontSize: "0.6rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--subtle)", marginBottom: "0.875rem" }}>Market intelligence</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "0.625rem" }}>
          {SIGNALS.map((s) => (
            <div key={s.artist} style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "10px", padding: "0.875rem 1rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: "0.85rem", marginBottom: "0.15rem" }}>{s.artist}</div>
                <div style={{ fontSize: "0.7rem", color: "var(--muted)" }}>{s.signal}</div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.72rem", color: "var(--green)", fontWeight: 600 }}>{s.stat}</div>
                {s.live && (
                  <div style={{ display: "flex", alignItems: "center", gap: "0.25rem", justifyContent: "flex-end", marginTop: "2px" }}>
                    <span style={{ width: "4px", height: "4px", borderRadius: "50%", background: "var(--green)", animation: "pulse 2s ease-in-out infinite" }} />
                    <span style={{ fontSize: "0.55rem", color: "var(--green)", letterSpacing: "0.06em" }}>LIVE</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* LIVE FEED */}
      <section style={{ maxWidth: "1000px", margin: "0 auto", padding: "0 1.25rem 5rem" }}>
        <p style={{ fontSize: "0.6rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--subtle)", marginBottom: "0.875rem" }}>Live activity</p>
        <LiveFeed limit={12} showHeader={false} />
      </section>
    </div>
  );
}