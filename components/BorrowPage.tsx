// FILE: components/BorrowPage.tsx
// Billboard-grade institutional borrow page.
"use client";
import { useAbraStore } from "@/lib/abraxasStore";

const M = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const BG = "#0C0E12"; const CARD = "#0E1117"; const BORDER = "#1F2937";

const LOOPSCALE = "https://loopscale.com";
const ABRA_CA   = "5c1FHZj36pkA3cpXcyZxDhRmQyxzUqMNQn8K5neDBAGS";

const LTV = [
  { class:"Fine Metals",    ltv:80, color:"#D4AF37", req:"LBMA bullion · Brinks custody" },
  { class:"Luxury Watches", ltv:65, color:"#6b8cff", req:"Certified authentication · horological vault" },
  { class:"Real Estate",    ltv:60, color:"#10B981", req:"Clear title · professional appraisal" },
  { class:"Mineral Rights", ltv:55, color:"#ED8936", req:"Non-op WI · proved reserves" },
  { class:"Fine Art",       ltv:50, color:"#f26b6b", req:"Provenance chain · institutional grade" },
];

const PROCESS = [
  { n:"01", t:"AAS-1 Verification",   d:"Asset undergoes 6-stage cryptographic authentication. SHA-256 document hashes anchored on Solana. Partner co-signs every state transition." },
  { n:"02", t:"Certificate Mint",     d:"Token-2022 certificate issued on Solana mainnet. Immutable proof of ownership. LTV tier assigned based on asset class and risk score." },
  { n:"03", t:"Collateral Activation",d:"Verified certificate becomes borrowable collateral. Risk engine scores custody method, telemetry freshness, and provenance chain integrity." },
  { n:"04", t:"USDC Draw",            d:"Non-recourse USDC liquidity via Loopscale lending rails. Draw up to your LTV limit. Health factor monitored in real time." },
];

export function BorrowPage() {
  const assets = useAbraStore(s => s.assets);
  const eligible = assets.filter(a => a.status === "collateral_eligible" || a.status === "verified");
  const capacity = eligible.reduce((s,a) => s + Math.round((a.estimatedUsd ?? 0) * (a.ltv ?? 60) / 100), 0);

  return (
    <div style={{ maxWidth:960, margin:"0 auto", color:"#f0f0f0" }}>

      {/* ── Billboard hero ────────────────────────────────────────────── */}
      <div style={{ padding:"3rem 0 2.5rem", textAlign:"center" }}>
        <div style={{ fontFamily:M, fontSize:"0.36rem", fontWeight:700,
                       color:"rgba(49,130,206,0.5)", textTransform:"uppercase",
                       letterSpacing:"0.25em", marginBottom:"1rem" }}>
          LOOPSCALE · SOLANA · NON-RECOURSE LENDING
        </div>
        <h1 style={{ fontFamily:M,
                      fontSize:"clamp(2.2rem,6vw,4rem)",
                      fontWeight:900, color:"#f0f0f0",
                      margin:"0 0 1rem", letterSpacing:"-0.04em", lineHeight:1 }}>
          BORROW AGAINST<br/>
          <span style={{ color:"#3182CE" }}>VERIFIED COLLATERAL</span>
        </h1>
        <p style={{ fontSize:"clamp(0.6rem,1.8vw,0.82rem)",
                     color:"rgba(255,255,255,0.35)", maxWidth:560,
                     margin:"0 auto 2rem", lineHeight:1.8, fontFamily:M }}>
          Submit real-world assets through AAS-1 verification.
          Receive Token-2022 certificates. Draw USDC liquidity
          against custody-backed collateral — non-custodial,
          non-recourse, on Solana.
        </p>

        {capacity > 0 ? (
          <div style={{ display:"inline-flex", flexDirection:"column",
                         alignItems:"center", padding:"2rem 3rem",
                         borderRadius:"8px",
                         border:"1px solid rgba(49,130,206,0.25)",
                         background:"rgba(49,130,206,0.06)",
                         marginBottom:"1.5rem" }}>
            <div style={{ fontFamily:M, fontSize:"0.36rem",
                           color:"rgba(49,130,206,0.5)",
                           textTransform:"uppercase", letterSpacing:"0.2em",
                           marginBottom:"0.5rem" }}>
              AVAILABLE BORROW CAPACITY
            </div>
            <div style={{ fontFamily:M,
                           fontSize:"clamp(2rem,5vw,3.2rem)",
                           fontWeight:900, color:"#3182CE" }}>
              ${capacity.toLocaleString()} USDC
            </div>
          </div>
        ) : (
          <div style={{ fontFamily:M, fontSize:"0.52rem",
                         color:"rgba(255,255,255,0.2)",
                         marginBottom:"1.5rem" }}>
            NO ELIGIBLE COLLATERAL — REGISTER ASSETS TO UNLOCK CAPACITY
          </div>
        )}

        <a href={LOOPSCALE} target="_blank" rel="noopener noreferrer"
          style={{
            display:"inline-block", padding:"1rem 2.5rem",
            borderRadius:"6px",
            border:"1px solid rgba(49,130,206,0.35)",
            background:"rgba(49,130,206,0.08)",
            fontFamily:M, fontSize:"0.66rem", fontWeight:900,
            color:"#3182CE", textDecoration:"none",
            letterSpacing:"0.06em", textTransform:"uppercase",
          }}>
          OPEN LOOPSCALE TERMINAL →
        </a>
      </div>

      {/* ── LTV table ─────────────────────────────────────────────────── */}
      <div style={{ marginBottom:"3rem" }}>
        <div style={{ fontFamily:M,
                       fontSize:"clamp(1rem,3vw,1.6rem)",
                       fontWeight:900, color:"#f0f0f0",
                       marginBottom:"1.25rem", letterSpacing:"-0.02em" }}>
          COLLATERAL LTV SCHEDULE
        </div>
        <div style={{ border:`1px solid ${BORDER}`, borderRadius:"7px", overflow:"hidden" }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 80px 1fr",
                         padding:"0.625rem 1.25rem",
                         borderBottom:`1px solid ${BORDER}`,
                         background:CARD, fontFamily:M, fontSize:"0.3rem",
                         color:"rgba(255,255,255,0.2)",
                         textTransform:"uppercase", letterSpacing:"0.12em" }}>
            <span>ASSET CLASS</span>
            <span style={{ textAlign:"center" }}>MAX LTV</span>
            <span>REQUIREMENTS</span>
          </div>
          {LTV.map((r, i) => (
            <div key={r.class} style={{
              display:"grid", gridTemplateColumns:"1fr 80px 1fr",
              padding:"1rem 1.25rem", alignItems:"center", gap:"0.75rem",
              borderBottom: i < LTV.length - 1 ? `1px solid ${BORDER}` : "none",
              background: i % 2 === 0 ? "transparent" : `${CARD}80`,
            }}>
              <span style={{ fontFamily:M,
                              fontSize:"clamp(0.56rem,1.6vw,0.72rem)",
                              fontWeight:800, color:"#f0f0f0" }}>
                {r.class}
              </span>
              <span style={{ fontFamily:M,
                              fontSize:"clamp(1rem,2.5vw,1.4rem)",
                              fontWeight:900, color:r.color,
                              textAlign:"center" }}>
                {r.ltv}%
              </span>
              <span style={{ fontFamily:M,
                              fontSize:"clamp(0.4rem,1.2vw,0.52rem)",
                              color:"rgba(255,255,255,0.3)" }}>
                {r.req}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Credit process ─────────────────────────────────────────────── */}
      <div style={{ marginBottom:"3rem" }}>
        <div style={{ fontFamily:M,
                       fontSize:"clamp(1rem,3vw,1.6rem)",
                       fontWeight:900, color:"#f0f0f0",
                       marginBottom:"1.25rem", letterSpacing:"-0.02em" }}>
          THE CREDIT PROCESS
        </div>
        <div style={{ display:"grid",
                       gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",
                       gap:"0.75rem" }}>
          {PROCESS.map(p => (
            <div key={p.n} style={{ padding:"1.25rem",
                                     background:CARD,
                                     border:`1px solid ${BORDER}`,
                                     borderRadius:"7px" }}>
              <div style={{ fontFamily:M,
                             fontSize:"clamp(1.2rem,3vw,1.8rem)",
                             fontWeight:900, color:"rgba(49,130,206,0.25)",
                             marginBottom:"0.625rem", lineHeight:1 }}>
                {p.n}
              </div>
              <div style={{ fontFamily:M,
                             fontSize:"clamp(0.6rem,1.8vw,0.76rem)",
                             fontWeight:800, color:"#f0f0f0",
                             marginBottom:"0.5rem" }}>
                {p.t}
              </div>
              <div style={{ fontFamily:M,
                             fontSize:"clamp(0.42rem,1.2vw,0.52rem)",
                             color:"rgba(255,255,255,0.35)", lineHeight:1.7 }}>
                {p.d}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Risk disclosure ────────────────────────────────────────────── */}
      <div style={{ padding:"1rem 1.25rem", borderRadius:"6px",
                     border:`1px solid ${BORDER}`,
                     fontFamily:M, fontSize:"0.4rem",
                     color:"rgba(255,255,255,0.18)", lineHeight:1.8 }}>
        Abraxas Protocol provides verification infrastructure only.
        Lending is provided by third-party protocols including Loopscale.
        Collateral positions are non-recourse against AAS-1 authenticated assets only.
        $ABRA required for protocol participation. CA:{" "}
        <a href={`https://bags.fm/${ABRA_CA}`} target="_blank"
           rel="noopener noreferrer"
           style={{ color:"rgba(200,169,110,0.4)" }}>
          {ABRA_CA.slice(0,8)}…
        </a>
      </div>
    </div>
  );
}
