// FILE: components/BorrowPage.tsx
// The payoff of the entire protocol. Institutional, focused, not overcrowded.
"use client";

import { useAbraStore } from "@/lib/abraxasStore";

const MONO = "'JetBrains Mono',monospace";
const LOOPSCALE_URL = "https://loopscale.com";
const ABRA_CA = "5c1FHZj36pkA3cpXcyZxDhRmQyxzUqMNQn8K5neDBAGS";
const BAGS_URL = `https://bags.fm/${ABRA_CA}`;

const LTV_TABLE = [
  { class:"Fine Metals",    ltv:80, color:"#D4AF37", desc:"LBMA-standard bullion, Brinks custody" },
  { class:"Luxury Watches", ltv:65, color:"#6b8cff", desc:"Certified, authenticated timepieces" },
  { class:"Real Estate",    ltv:60, color:"#14F195", desc:"Clear title, professional appraisal" },
  { class:"Mineral Rights", ltv:55, color:"#C8A96E", desc:"Non-op WI, proved reserves" },
  { class:"Fine Art",       ltv:50, color:"#f26b6b", desc:"Provenance verified, institutional grade" },
];

const HOW = [
  { step:"01", title:"Tokenize",      desc:"Submit your asset through the Studio. Partner authentication issues an on-chain AAS-1 certificate." },
  { step:"02", title:"Collateralize", desc:"Verified Token-2022 certificate becomes eligible collateral. LTV assigned by asset class and risk score." },
  { step:"03", title:"Borrow",        desc:"Draw USDC against your collateral via Loopscale's lending protocol. Non-custodial, non-recourse." },
  { step:"04", title:"Repay",         desc:"Repay with interest to unlock your collateral. Certificate remains valid and reusable." },
];

export function BorrowPage() {
  const assets         = useAbraStore(s => s.assets);
  const eligibleAssets = assets.filter(a => a.status === "collateral_eligible");
  const borrowCapacity = eligibleAssets.reduce(
    (s, a) => s + Math.round((a.estimatedUsd ?? 0) * (a.ltv ?? 60) / 100), 0
  );

  return (
    <div style={{ width:"100%", maxWidth:960, margin:"0 auto" }}>

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <div style={{ textAlign:"center", padding:"2rem 0 2.5rem" }}>
        <div style={{ fontSize:"0.38rem", fontWeight:700, color:"rgba(107,140,255,0.5)",
                       fontFamily:MONO, textTransform:"uppercase", letterSpacing:"0.2em",
                       marginBottom:"0.75rem" }}>
          Loopscale · Solana · Non-Custodial
        </div>
        <h1 style={{ fontSize:"clamp(1.8rem, 5vw, 3.2rem)", fontWeight:900,
                     color:"#f0f0f0", margin:"0 0 0.75rem",
                     letterSpacing:"-0.03em", lineHeight:1 }}>
          Borrow Against<br />
          <span style={{ color:"#6b8cff" }}>Verified Collateral</span>
        </h1>
        <p style={{ fontSize:"clamp(0.56rem, 1.5vw, 0.76rem)",
                     color:"rgba(255,255,255,0.35)", maxWidth:480,
                     margin:"0 auto 2rem", lineHeight:1.75 }}>
          Submit real-world assets for verification and unlock
          non-recourse USDC borrowing capacity against your
          Token-2022 collateral certificates.
        </p>

        {borrowCapacity > 0 ? (
          <div style={{
            display:"inline-flex", flexDirection:"column", alignItems:"center",
            padding:"1.5rem 2.5rem", borderRadius:"10px",
            border:"1px solid rgba(107,140,255,0.25)",
            background:"rgba(107,140,255,0.06)", marginBottom:"1.5rem",
          }}>
            <div style={{ fontSize:"0.38rem", color:"rgba(107,140,255,0.5)",
                           fontFamily:MONO, textTransform:"uppercase",
                           letterSpacing:"0.15em", marginBottom:"0.4rem" }}>
              Your Borrowing Capacity
            </div>
            <div style={{ fontSize:"clamp(1.8rem, 5vw, 2.8rem)", fontWeight:900,
                           color:"#6b8cff", fontFamily:MONO }}>
              ${borrowCapacity.toLocaleString()} USDC
            </div>
          </div>
        ) : (
          <div style={{ marginBottom:"1.5rem" }}>
            <a href="#" onClick={e => { e.preventDefault(); window.scrollTo({ top:0, behavior:"smooth" }); }}
              style={{
                display:"inline-block", padding:"1rem 2.5rem",
                borderRadius:"7px", border:"none", cursor:"pointer",
                fontWeight:900, fontSize:"0.76rem", fontFamily:MONO,
                background:"linear-gradient(135deg, #7c3aed, #6b8cff)",
                color:"#fff", textDecoration:"none",
              }}>
              Tokenize an Asset First →
            </a>
          </div>
        )}

        {eligibleAssets.length > 0 && (
          <a href={LOOPSCALE_URL} target="_blank" rel="noopener noreferrer"
            style={{
              display:"inline-block", padding:"1rem 2.5rem",
              borderRadius:"7px",
              border:"1px solid rgba(107,140,255,0.35)",
              background:"rgba(107,140,255,0.08)",
              fontWeight:900, fontSize:"0.72rem", fontFamily:MONO,
              color:"rgba(107,140,255,0.9)", textDecoration:"none",
            }}>
            Open Loopscale →
          </a>
        )}
      </div>

      {/* ── LTV table ────────────────────────────────────────────────── */}
      <div style={{
        borderRadius:"10px", border:"1px solid rgba(255,255,255,0.07)",
        overflow:"hidden", marginBottom:"2.5rem",
      }}>
        <div style={{
          padding:"0.875rem 1.25rem",
          borderBottom:"1px solid rgba(255,255,255,0.06)",
          display:"grid", gridTemplateColumns:"1fr 80px 1fr",
          fontSize:"0.36rem", fontWeight:700, color:"rgba(255,255,255,0.2)",
          fontFamily:MONO, textTransform:"uppercase", letterSpacing:"0.12em",
        }}>
          <span>Asset Class</span><span style={{textAlign:"center"}}>Max LTV</span><span>Requirements</span>
        </div>
        {LTV_TABLE.map((row, i) => (
          <div key={row.class} style={{
            padding:"0.875rem 1.25rem",
            borderBottom: i < LTV_TABLE.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
            display:"grid", gridTemplateColumns:"1fr 80px 1fr",
            alignItems:"center", gap:"0.75rem",
          }}>
            <span style={{ fontSize:"clamp(0.54rem, 1.5vw, 0.68rem)",
                            fontWeight:700, color:"#f0f0f0" }}>
              {row.class}
            </span>
            <span style={{
              textAlign:"center", fontSize:"0.9rem", fontWeight:900,
              color:row.color, fontFamily:MONO,
            }}>
              {row.ltv}%
            </span>
            <span style={{ fontSize:"clamp(0.44rem, 1.2vw, 0.56rem)",
                            color:"rgba(255,255,255,0.3)" }}>
              {row.desc}
            </span>
          </div>
        ))}
      </div>

      {/* ── How it works ─────────────────────────────────────────────── */}
      <div style={{ marginBottom:"2.5rem" }}>
        <div style={{ fontSize:"clamp(0.8rem, 2.5vw, 1.2rem)", fontWeight:900,
                       color:"#f0f0f0", marginBottom:"1.25rem",
                       letterSpacing:"-0.01em" }}>
          How It Works
        </div>
        <div style={{
          display:"grid",
          gridTemplateColumns:"repeat(auto-fill, minmax(200px, 1fr))",
          gap:"0.75rem",
        }}>
          {HOW.map(h => (
            <div key={h.step} style={{
              padding:"1.25rem", borderRadius:"8px",
              border:"1px solid rgba(255,255,255,0.07)",
              background:"rgba(255,255,255,0.02)",
            }}>
              <div style={{ fontSize:"0.44rem", fontWeight:900, color:"rgba(107,140,255,0.4)",
                             fontFamily:MONO, marginBottom:"0.5rem" }}>
                {h.step}
              </div>
              <div style={{ fontSize:"clamp(0.62rem, 1.8vw, 0.8rem)", fontWeight:800,
                             color:"#f0f0f0", marginBottom:"0.4rem" }}>
                {h.title}
              </div>
              <div style={{ fontSize:"clamp(0.46rem, 1.2vw, 0.56rem)",
                             color:"rgba(255,255,255,0.35)", lineHeight:1.65 }}>
                {h.desc}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Risk disclosure ───────────────────────────────────────────── */}
      <div style={{
        padding:"1rem 1.25rem", borderRadius:"7px",
        border:"1px solid rgba(255,255,255,0.05)",
        fontSize:"0.44rem", color:"rgba(255,255,255,0.2)",
        lineHeight:1.7, fontFamily:MONO,
      }}>
        Abraxas Protocol provides verification infrastructure only. Lending services are
        provided by Loopscale and other third-party protocols. Collateral positions are
        non-recourse against authenticated assets only. AAS-1 standard applies.
        $ABRA required for protocol participation.{" "}
        <a href={BAGS_URL} target="_blank" rel="noopener noreferrer"
          style={{ color:"rgba(200,169,110,0.5)", textDecoration:"none" }}>
          Acquire ABRA →
        </a>
      </div>

    </div>
  );
}
