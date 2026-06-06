// FILE: app/lending/page.tsx — Lending Engine — Coming Online (not a 404)
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
export const metadata: Metadata = { title: "Lending Engine · Abraxas Protocol" };

const M = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const S = "system-ui,-apple-system,sans-serif";

export default function LendingPage() {
  return (
    <div style={{ background: "#040608", minHeight: "100vh", color: "#F8FAFC",
                   fontFamily: S, display: "flex", flexDirection: "column" }}>
      {/* Status strip */}
      <div style={{ background: "#020406", borderBottom: "1px solid #0F1929",
                     padding: "0 1.5rem", height: 28,
                     display: "flex", alignItems: "center", gap: "0.92rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#F59E0B",
                         boxShadow: "0 0 5px rgba(245,158,11,0.7)" }}/>
          <span style={{ fontFamily: M, fontSize: "0.6rem", fontWeight: 700,
                          color: "rgba(255,255,255,0.3)", letterSpacing: "0.12em",
                          textTransform: "uppercase" }}>
            LENDING ENGINE · COMING ONLINE
          </span>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ background: "rgba(4,6,8,0.97)", borderBottom: "1px solid #1C2333",
                     display: "flex", alignItems: "center", padding: "0 1.5rem",
                     height: 52, gap: "0.92rem" }}>
        <Link href="/terminal" style={{ display:"flex", alignItems:"center",
                       gap:"0.375rem", textDecoration:"none", marginRight:"0.7rem" }}>
          <Image src="/icon-48.png" alt="" width={22} height={22}/>
          <span style={{ fontFamily: M, fontSize: "1.1rem", fontWeight: 900,
                          color: "#F8FAFC" }}>ABRAXAS</span>
        </Link>
        {["TERMINAL","LENDING","DASHBOARD"].map(t => (
          <Link key={t} href={t==="TERMINAL"?"/terminal":t==="LENDING"?"/lending":"/dashboard"}
            style={{
              padding: "0.25rem 0.75rem", borderRadius: 4, textDecoration: "none",
              border: t==="LENDING" ? "1px solid rgba(245,158,11,0.5)" : "1px solid #1C2333",
              background: t==="LENDING" ? "rgba(245,158,11,0.08)" : "transparent",
              color: t==="LENDING" ? "#F59E0B" : "rgba(255,255,255,0.3)",
              fontFamily: M, fontSize: "0.78rem", fontWeight: 700,
              textTransform: "uppercase", letterSpacing: "0.08em",
              whiteSpace: "nowrap",
            }}>
            {t}
          </Link>
        ))}
      </nav>

      <div style={{ maxWidth: 900, margin: "0 auto", width: "100%",
                     padding: "3rem clamp(1rem,3vw,2rem)" }}>

        {/* Header */}
        <div style={{ marginBottom: "3rem" }}>
          <div style={{ fontFamily: M, fontSize: "0.75rem", fontWeight: 700,
                         color: "rgba(245,158,11,0.8)", textTransform: "uppercase",
                         letterSpacing: "0.25em", marginBottom: "0.92rem" }}>
            ABRAXAS LENDING ENGINE · STATUS: COMING ONLINE
          </div>
          <h1 style={{ fontFamily: "Georgia, serif",
                        fontSize: "clamp(2rem,5vw,3.5rem)", fontWeight: 800,
                        color: "#F8FAFC", margin: "0 0 0.75rem", letterSpacing: "-0.02em",
                        lineHeight: 1.1 }}>
            Collateral-backed lending<br/>
            <span style={{ color: "#F59E0B" }}>for verified real-world assets.</span>
          </h1>
          <p style={{ fontFamily: S, fontSize: "clamp(0.86rem,1.8vw,1.05rem)",
                       color: "rgba(255,255,255,0.45)", lineHeight: 1.75,
                       maxWidth: 620 }}>
            Once your asset completes the Abraxas verification pipeline, it
            becomes eligible for USDC lending at up to 60% LTV. Lending
            infrastructure is in active development.
          </p>
        </div>

        {/* Supported asset classes */}
        <div style={{ background: "#0C0F14", border: "1px solid #1C2333",
                       borderRadius: 8, padding: "1.5rem", marginBottom: "1.5rem" }}>
          <div style={{ fontFamily: M, fontSize: "0.7rem", color: "rgba(255,255,255,0.3)",
                         textTransform: "uppercase", letterSpacing: "0.15em",
                         marginBottom: "0.92rem" }}>
            SUPPORTED COLLATERAL CLASSES
          </div>
          <div style={{ display: "grid",
                         gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))",
                         gap: "0.92rem" }}>
            {[
              { label: "Real Estate",       status: "PRIORITY",  color: "#10B981" },
              { label: "Mineral Rights",    status: "PRIORITY",  color: "#10B981" },
              { label: "Business Equity",   status: "COMING",    color: "#F59E0B" },
              { label: "Equipment",         status: "COMING",    color: "#F59E0B" },
              { label: "Music Royalties",   status: "PHASE 2",   color: "#8B5CF6" },
              { label: "Precious Metals",   status: "PHASE 2",   color: "#8B5CF6" },
            ].map(a => (
              <div key={a.label} style={{ padding: "0.82rem", background: "#080B10",
                                           border: "1px solid #1C2333", borderRadius: 6,
                                           borderLeft: `3px solid ${a.color}` }}>
                <div style={{ fontFamily: S, fontSize: "0.86rem", fontWeight: 700,
                               color: "#F8FAFC", marginBottom: 4 }}>
                  {a.label}
                </div>
                <span style={{ fontFamily: M, fontSize: "0.6rem", fontWeight: 700,
                                color: a.color, background: `${a.color}15`,
                                borderRadius: 3, padding: "1px 6px",
                                letterSpacing: "0.08em" }}>
                  {a.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Collateralization framework */}
        <div style={{ background: "#0C0F14", border: "1px solid #1C2333",
                       borderRadius: 8, padding: "1.5rem", marginBottom: "1.5rem" }}>
          <div style={{ fontFamily: M, fontSize: "0.7rem", color: "rgba(255,255,255,0.3)",
                         textTransform: "uppercase", letterSpacing: "0.15em",
                         marginBottom: "0.92rem" }}>
            COLLATERALIZATION FRAMEWORK
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "1px",
                         border: "1px solid #1C2333", borderRadius: 6, overflow: "hidden" }}>
            {[
              { metric: "Max LTV",      value: "60%",     color: "#10B981" },
              { metric: "Base APR",     value: "8.5%",    color: "#3B82F6" },
              { metric: "Min Value",    value: "$100K",   color: "#F59E0B" },
            ].map(r => (
              <div key={r.metric} style={{ background: "#080B10", padding: "0.92rem",
                                            borderTop: `3px solid ${r.color}` }}>
                <div style={{ fontFamily: M, fontSize: "0.7rem", color: "rgba(255,255,255,0.3)",
                               marginBottom: 4 }}>{r.metric}</div>
                <div style={{ fontFamily: M, fontSize: "1.2rem", fontWeight: 900,
                               color: r.color }}>{r.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Current lending partners */}
        <div style={{ background: "#0C0F14", border: "1px solid #1C2333",
                       borderRadius: 8, padding: "1.5rem", marginBottom: "2rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between",
                         alignItems: "baseline", marginBottom: "0.7rem" }}>
            <div style={{ fontFamily: M, fontSize: "0.7rem", color: "rgba(255,255,255,0.3)",
                           textTransform: "uppercase", letterSpacing: "0.15em" }}>
              CURRENT LENDING PARTNERS
            </div>
            <a href="https://app.loopscale.com/vaults" target="_blank"
              rel="noopener noreferrer"
              style={{ fontFamily: M, fontSize: "0.7rem", color: "#3B82F6",
                        textDecoration: "none" }}>
              Loopscale ↗
            </a>
          </div>
          <div style={{ fontFamily: S, fontSize: "0.84rem",
                         color: "rgba(255,255,255,0.5)", lineHeight: 1.7 }}>
            Current borrowing available through Loopscale vaults while the
            native Abraxas lending infrastructure completes development.
            Native engine targets Q3 2025.
          </div>
        </div>

        <div style={{ textAlign: "center" }}>
          <Link href="/terminal" style={{
            display: "inline-block", padding: "0.875rem 2rem", borderRadius: 5,
            background: "#F59E0B", color: "#000", fontFamily: M,
            fontSize: "0.92rem", fontWeight: 900, letterSpacing: "0.04em",
            textTransform: "uppercase", textDecoration: "none",
          }}>
            SUBMIT AN ASSET TO BEGIN →
          </Link>
        </div>
      </div>
    </div>
  );
}
