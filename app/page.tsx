// FILE: app/page.tsx
// Server boundary: this file uses "use client" because NFTSection uses hooks.
// Everything static (hero, stats, asset grid) can be made server-side later
// by splitting into separate server component + NFTSection client island.
"use client";

import Link from "next/link";
import { TOTAL_AUM, ACTIVE_VAULTS, ASSET_TYPES, fmtUSD } from "@/lib/appData";
import { useNFTCollections, fmtFloor, fmtVol, fmtChange } from "@/lib/marketFeeds";
import type { NormalizedCollection } from "@/lib/types/nft";
import { LiveFeed } from "@/components/LiveFeed";

// ─── NFT Section — all state, no silent failures ──────────────────────────────
function NFTSection() {
  const { collections, loading, error, source, fetchedAt, retry } = useNFTCollections("ethereum", 20);

  const ts = fetchedAt ? new Date(fetchedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : null;

  return (
    <section style={{ maxWidth: "1000px", margin: "0 auto", padding: "0 1.25rem 3rem" }}>
      <div style={{ marginBottom: "1.25rem" }}>
        <p style={{ fontSize: "0.6rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--subtle)", marginBottom: "0.4rem" }}>Signal layer</p>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
          <div>
            <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 800, fontSize: "1.2rem", letterSpacing: "-0.01em", marginBottom: "0.2rem" }}>
              NFT collections
            </h2>
            <p style={{ fontSize: "0.72rem", color: "var(--muted)" }}>
              Collections generate signals → vaults deploy capital → yield is produced
            </p>
          </div>
          {ts && (
            <span style={{ fontSize: "0.6rem", color: "var(--subtle)" }}>
              {source?.includes("authenticated") ? "🔑" : "🌐"} {source?.replace("_", " ")} · {ts}
            </span>
          )}
        </div>
      </div>

      <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "10px", overflow: "hidden" }}>
        {/* Column headers */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 90px 90px 72px auto", gap: "0.5rem", padding: "0.5rem 1rem", borderBottom: "1px solid var(--line)" }}>
          {["Collection", "Floor", "Vol 24h", "Chg", "Signal"].map((h) => (
            <span key={h} style={{ fontSize: "0.58rem", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--subtle)" }}>{h}</span>
          ))}
        </div>

        {/* LOADING — skeleton rows, never blank */}
        {loading && (
          <div>
            {[...Array(8)].map((_, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 90px 90px 72px auto", gap: "0.5rem", alignItems: "center", padding: "0.65rem 1rem", borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                {[1, 0.5, 0.5, 0.4, 0.7].map((w, j) => (
                  <div key={j} style={{ height: "10px", borderRadius: "4px", background: "rgba(255,255,255,0.06)", width: `${w * 100}%`, animation: "pulse 1.5s ease-in-out infinite" }} />
                ))}
              </div>
            ))}
          </div>
        )}

        {/* ERROR — explicit state with retry, never collapse */}
        {!loading && error && (
          <div style={{ padding: "2rem 1rem", textAlign: "center" }}>
            <p style={{ fontSize: "0.82rem", color: "#f26b6b", marginBottom: "0.625rem" }}>
              Could not load collection data.
            </p>
            <p style={{ fontSize: "0.72rem", color: "var(--subtle)", marginBottom: "1rem" }}>
              {error}
            </p>
            <button
              onClick={retry}
              style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "6px", padding: "0.45rem 1rem", fontSize: "0.75rem", color: "var(--text)", cursor: "pointer" }}>
              Retry
            </button>
          </div>
        )}

        {/* EMPTY — not an error, just no results */}
        {!loading && !error && collections.length === 0 && (
          <div style={{ padding: "2rem 1rem", textAlign: "center" }}>
            <p style={{ fontSize: "0.78rem", color: "var(--subtle)" }}>No collections returned from Reservoir.</p>
            <button onClick={retry} style={{ marginTop: "0.625rem", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "6px", padding: "0.4rem 0.875rem", fontSize: "0.72rem", color: "var(--text)", cursor: "pointer" }}>
              Retry
            </button>
          </div>
        )}

        {/* DATA ROWS */}
        {!loading && !error && collections.map((c: NormalizedCollection) => (
          <div key={c.id}
            style={{ display: "grid", gridTemplateColumns: "1fr 90px 90px 72px auto", gap: "0.5rem", alignItems: "center", padding: "0.55rem 1rem", borderBottom: "1px solid rgba(255,255,255,0.03)", cursor: "pointer" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.02)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", minWidth: 0 }}>
              {c.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.image} alt="" width={18} height={18} style={{ borderRadius: "3px", flexShrink: 0, objectFit: "cover" }} />
              )}
              <span style={{ fontSize: "0.82rem", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {c.name}
              </span>
            </div>
            <span style={{ fontSize: "0.72rem", color: "var(--muted)", fontFamily: "'JetBrains Mono', monospace" }}>
              {fmtFloor(c.floorPrice, c.floorSymbol)}
            </span>
            <span style={{ fontSize: "0.72rem", color: "var(--muted)", fontFamily: "'JetBrains Mono', monospace" }}>
              {fmtVol(c.volume24h)}
            </span>
            <span style={{ fontSize: "0.72rem", fontWeight: 600, fontFamily: "'JetBrains Mono', monospace", color: c.positive ? "var(--green)" : "#f26b6b" }}>
              {fmtChange(c.change24h)}
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
              <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: c.positive ? "var(--green)" : "var(--subtle)", flexShrink: 0 }} />
              <span style={{ fontSize: "0.65rem", color: "var(--muted)", whiteSpace: "nowrap" }}>
                {c.positive ? "signal ↑" : "signal ↓"}
              </span>
            </div>
          </div>
        ))}

        {/* FOOTER — source attribution, always visible */}
        <div style={{ padding: "0.6rem 1rem", borderTop: "1px solid var(--line)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
          <span style={{ fontSize: "0.6rem", color: "var(--subtle)" }}>
            Powered by{" "}
            <a href="https://reservoir.tools" target="_blank" rel="noopener noreferrer" style={{ color: "var(--gold)", textDecoration: "none" }}>Reservoir</a>
            {" "}· Ethereum mainnet
          </span>
          <Link href="/operate" style={{ fontSize: "0.7rem", color: "var(--gold)", textDecoration: "none", fontWeight: 600 }}>
            Deploy capital →
          </Link>
        </div>
      </div>
    </section>
  );
}

// ─── Homepage ─────────────────────────────────────────────────────────────────
export default function HomePage() {
  return (
    <div style={{ background: "var(--void)", minHeight: "100vh" }}>
      {/* HERO */}
      <section style={{ maxWidth: "700px", margin: "0 auto", padding: "5rem 1.25rem 3.5rem", textAlign: "center" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", background: "rgba(61,214,140,0.08)", border: "1px solid rgba(61,214,140,0.2)", borderRadius: "100px", padding: "0.3rem 0.75rem", marginBottom: "1.75rem" }}>
          <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: "var(--green)", animation: "pulse 2s ease-in-out infinite" }} />
          <span style={{ fontSize: "0.62rem", color: "var(--green)", fontWeight: 600 }}>
            {ACTIVE_VAULTS} vaults live · {fmtUSD(TOTAL_AUM)} operating
          </span>
        </div>
        <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 800, fontSize: "clamp(2.1rem, 7vw, 4rem)", lineHeight: 1.05, letterSpacing: "-0.025em", marginBottom: "1rem" }}>
          Turn real assets into yield.
        </h1>
        <p style={{ fontSize: "1rem", color: "var(--muted)", maxWidth: "460px", margin: "0 auto 0.75rem", lineHeight: 1.6 }}>
          Deploy capital into vaults and earn. Music royalties, real estate, receivables — operating on Solana.
        </p>
        <p style={{ fontSize: "0.8rem", color: "var(--subtle)", marginBottom: "2rem" }}>
          Pick an asset → customize → deposit → earn.
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
            { v: fmtUSD(TOTAL_AUM),       k: "Total AUM",    link: "/methodology" },
            { v: String(ACTIVE_VAULTS),    k: "Active Vaults",link: "/operate" },
            { v: "$0",                     k: "Unrecovered",  link: "/methodology", green: true },
            { v: "5",                      k: "Agents Online",link: "/operate" },
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

      {/* NFT COLLECTIONS — live Reservoir, explicit error states */}
      <NFTSection />

      {/* LIVE ACTIVITY FEED */}
      <section style={{ maxWidth: "1000px", margin: "0 auto", padding: "0 1.25rem 5rem" }}>
        <p style={{ fontSize: "0.6rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--subtle)", marginBottom: "0.875rem" }}>Live activity</p>
        <LiveFeed limit={12} showHeader={false} />
      </section>
    </div>
  );
}