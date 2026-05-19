// FILE: components/BorrowPage.tsx
// Institutional borrow page. FAQ on both topics. Loopscale CTA.
// Typography at readable DeFi scale.
"use client";

import { useState } from "react";

const MONO = "'JetBrains Mono',monospace";
const ABRA_CA = "5c1FHZj36pkA3cpXcyZxDhRmQyxzUqMNQn8K5neDBAGS";

const PROTOCOL_SPECS = [
  ["Protocol",       "Loopscale"],
  ["Collateral",     "Abraxas Token-2022 verified positions"],
  ["Settlement",     "USDC on Solana"],
  ["Fixed APR",      "5.2%"],
  ["LTV Range",      "45% — 80% (class-dependent)"],
  ["Custody",        "Asset held by verified partner throughout loan period"],
  ["Liquidation",    "Health factor monitored in real time. Alerts issued below threshold."],
];

const FAQ_BORROW = [
  {
    q: "What qualifies as borrowable collateral?",
    a: "Any asset that has completed the full Abraxas verification pipeline — passing authentication partner review, provenance validation, custody assignment, and risk scoring. The asset must hold a valid Verification Certificate before borrow eligibility activates.",
  },
  {
    q: "How is my LTV determined?",
    a: "LTV is computed by the Abraxas collateral scoring engine based on four factors: liquidity (30%), custody quality (30%), price volatility (20%), and provenance depth (20%). A high-confidence asset gets the class maximum. Lower confidence reduces LTV proportionally.",
  },
  {
    q: "What happens if my collateral value falls?",
    a: "Loopscale monitors your health factor in real time. If collateral value drops toward the liquidation threshold, you receive an alert. You can deposit additional collateral or partially repay to restore the health factor above the minimum.",
  },
  {
    q: "Is my physical asset sold during the loan?",
    a: "No. The physical asset remains with the institutional custodian throughout the loan period. Ownership does not transfer. You retain the on-chain Token-2022 certificate and reclaim the asset upon full repayment.",
  },
  {
    q: "Can I borrow against a mineral rights position?",
    a: "Mineral rights and non-operated working interests are supported with LTV caps set by the reserve scoring engine (P90/P50 reserve category, title status, and production history). These assets require extended verification timelines due to regulatory complexity.",
  },
  {
    q: "What if I cannot repay by the due date?",
    a: "You should contact Loopscale directly before the due date. Abraxas does not control loan terms — the lending protocol manages all repayment, extension, and liquidation mechanics. Refer to Loopscale's documentation for their specific policies.",
  },
];

const FAQ_VERIFICATION = [
  {
    q: "How long does the full verification process take?",
    a: "Standard collectibles (watches, graded cards, spirits): 5 — 10 business days. Real estate and mineral rights: 2 — 6 weeks depending on jurisdiction and title complexity. Tribal land assets require additional time for BIA and tribal council review.",
  },
  {
    q: "Who physically verifies my asset?",
    a: "Named authentication partners from the Abraxas partner registry — including certified grading services, licensed appraisers, institutional custodians, and regulatory authorities. You can see the assigned verifier on your asset detail page.",
  },
  {
    q: "What happens if my asset fails verification?",
    a: "You receive a detailed rejection report specifying which stage failed and why. Common reasons include incomplete provenance documentation, appraisal confidence below threshold, or title defects. Many rejections are resolvable by submitting additional documentation.",
  },
  {
    q: "Is the verification certificate transferable?",
    a: "The Token-2022 verification certificate is on-chain and linked to the verified wallet. Transfer of the certificate requires a dual-signature process including the original owner and custodian co-signature, ensuring custody chain integrity.",
  },
];

function FAQ({ items }: { items: { q:string; a:string }[] }) {
  const [open, setOpen] = useState<number|null>(null);
  return (
    <div style={{ border:"1px solid rgba(255,255,255,0.07)", borderRadius:"8px", overflow:"hidden" }}>
      {items.map((item, i) => (
        <div key={i} style={{ borderBottom: i<items.length-1?"1px solid rgba(255,255,255,0.05)":"none" }}>
          <button onClick={() => setOpen(open===i?null:i)} style={{
            width:"100%", padding:"1rem 1.25rem", background:"none", border:"none",
            cursor:"pointer", display:"flex", justifyContent:"space-between",
            alignItems:"flex-start", gap:"1rem", textAlign:"left",
          }}>
            <span style={{ fontSize:"0.72rem", fontWeight:700, color:"#f0f0f0",
              flex:1, lineHeight:1.4 }}>{item.q}</span>
            <span style={{ fontSize:"0.9rem", color:"rgba(255,255,255,0.25)",
              flexShrink:0, marginTop:2 }}>{open===i?"−":"+"}</span>
          </button>
          {open===i && (
            <div style={{ padding:"0 1.25rem 1rem", fontSize:"0.62rem",
              color:"rgba(255,255,255,0.4)", lineHeight:1.8 }}>
              {item.a}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export function BorrowPage() {
  return (
    <div style={{ maxWidth:680, margin:"3rem auto", padding:"0 1rem 4rem" }}>

      {/* Header */}
      <div style={{ marginBottom:"2.5rem" }}>
        <div style={{ fontSize:"0.52rem", color:"rgba(255,255,255,0.25)",
          fontFamily:MONO, textTransform:"uppercase",
          letterSpacing:"0.2em", marginBottom:"0.625rem" }}>
          Capital Access
        </div>
        <h1 style={{ fontWeight:900, fontSize:"clamp(1.8rem,4vw,2.8rem)",
          color:"#f0f0f0", margin:"0 0 1rem",
          letterSpacing:"-0.04em", lineHeight:1.05 }}>
          Borrow Against<br/>
          <span style={{ color:"#14F195" }}>Verified Collateral</span>
        </h1>
        <p style={{ fontSize:"0.66rem", color:"rgba(255,255,255,0.38)",
          lineHeight:1.8, margin:0, maxWidth:520 }}>
          Verified Abraxas assets unlock USDC liquidity via Loopscale.
          Retain ownership of your physical asset. Access capital immediately.
          No selling required. No KYC beyond your Solana wallet.
        </p>
      </div>

      {/* Protocol spec */}
      <div style={{ padding:"1.25rem", background:"rgba(255,255,255,0.02)",
        border:"1px solid rgba(255,255,255,0.08)", borderRadius:"8px",
        marginBottom:"1.75rem" }}>
        {PROTOCOL_SPECS.map(([k,v]) => (
          <div key={k} style={{ display:"flex", justifyContent:"space-between",
            padding:"0.625rem 0", borderBottom:"1px solid rgba(255,255,255,0.05)",
            gap:"1rem", flexWrap:"wrap" }}>
            <span style={{ fontSize:"0.52rem", color:"rgba(255,255,255,0.3)",
              fontFamily:MONO, textTransform:"uppercase",
              letterSpacing:"0.1em", flexShrink:0 }}>{k}</span>
            <span style={{ fontSize:"0.58rem", fontWeight:600,
              color:"rgba(255,255,255,0.6)", textAlign:"right" }}>{v}</span>
          </div>
        ))}
      </div>

      {/* CTA */}
      <button onClick={() => window.open("https://app.loopscale.com","_blank","noopener")}
        style={{ width:"100%", padding:"1.1rem", borderRadius:"7px",
          border:"1px solid rgba(107,140,255,0.4)", cursor:"pointer",
          fontWeight:800, fontSize:"0.78rem", fontFamily:MONO,
          letterSpacing:"0.04em", background:"rgba(107,140,255,0.08)",
          color:"#6b8cff", marginBottom:"0.75rem", transition:"all 0.15s" }}>
        Open Loopscale to Borrow
      </button>
      <div style={{ fontSize:"0.52rem", color:"rgba(255,255,255,0.18)",
        textAlign:"center", fontFamily:MONO, lineHeight:1.6,
        marginBottom:"3rem" }}>
        Connect your wallet on Loopscale. Abraxas verified positions are automatically recognized.
      </div>

      {/* Acquire ABRA */}
      <div style={{ padding:"1.25rem", border:"1px solid rgba(200,169,110,0.15)",
        borderRadius:"8px", background:"rgba(200,169,110,0.03)", marginBottom:"2.5rem" }}>
        <div style={{ fontSize:"0.52rem", fontWeight:700,
          color:"rgba(200,169,110,0.6)", fontFamily:MONO,
          textTransform:"uppercase", letterSpacing:"0.15em",
          marginBottom:"0.5rem" }}>Need ABRA to Tokenize?</div>
        <div style={{ fontSize:"0.6rem", color:"rgba(255,255,255,0.35)",
          marginBottom:"1rem", lineHeight:1.7 }}>
          ABRA is required to initiate tokenization. Acquire on Jupiter or Bags.
        </div>
        <div style={{ display:"flex", gap:"0.625rem", flexWrap:"wrap" }}>
          <a href={`https://jup.ag/swap/SOL-${ABRA_CA}`}
            target="_blank" rel="noopener noreferrer"
            style={{ padding:"0.55rem 1.1rem", borderRadius:"5px",
              textDecoration:"none", border:"1px solid rgba(200,169,110,0.25)",
              background:"rgba(200,169,110,0.07)", color:"#C8A96E",
              fontSize:"0.58rem", fontWeight:700, fontFamily:MONO }}>
            Buy on Jupiter
          </a>
          <a href={`https://bags.fm/${ABRA_CA}`}
            target="_blank" rel="noopener noreferrer"
            style={{ padding:"0.55rem 1.1rem", borderRadius:"5px",
              textDecoration:"none", border:"1px solid rgba(107,140,255,0.2)",
              background:"rgba(107,140,255,0.06)", color:"#6b8cff",
              fontSize:"0.58rem", fontWeight:700, fontFamily:MONO }}>
            Trade on Bags
          </a>
        </div>
      </div>

      {/* FAQ: Borrowing */}
      <div style={{ marginBottom:"2.5rem" }}>
        <div style={{ fontSize:"0.56rem", fontWeight:700,
          color:"rgba(255,255,255,0.2)", fontFamily:MONO,
          textTransform:"uppercase", letterSpacing:"0.18em",
          marginBottom:"1rem" }}>Borrowing — Frequently Asked</div>
        <FAQ items={FAQ_BORROW} />
      </div>

      {/* FAQ: Verification */}
      <div>
        <div style={{ fontSize:"0.56rem", fontWeight:700,
          color:"rgba(255,255,255,0.2)", fontFamily:MONO,
          textTransform:"uppercase", letterSpacing:"0.18em",
          marginBottom:"1rem" }}>Verification — Frequently Asked</div>
        <FAQ items={FAQ_VERIFICATION} />
      </div>
    </div>
  );
}