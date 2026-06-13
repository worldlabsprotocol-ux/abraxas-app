"use client";
// FILE: components/terminal/WyomingSection.tsx
// Wyoming LLC formation tiers. Payment strip shows USDC primary, Stripe coming soon.

import { M, S, G, B, W, BDR, CARD } from "./tokens";
import { Label } from "./ui";

type WyomingTier = "starter" | "growth" | "enterprise";

interface WyomingSectionProps {
  onSelectTier: (tier: WyomingTier) => void;
  onBrowse: () => void;
}

interface TierDef {
  id: WyomingTier;
  tier: string;
  price: string;
  color: string;
  items: string[];
}

const TIERS: TierDef[] = [
  {
    id:"starter", tier:"STARTER", price:"$1,499", color:B,
    items:["Wyoming LLC Formation","Operating Agreement","On-chain Token","V5 Verification"],
  },
  {
    id:"growth", tier:"GROWTH", price:"$2,999", color:"#8B5CF6",
    items:["Everything in Starter","Multi-sig Governance","Cap Table Mgmt","Lending Eligible"],
  },
  {
    id:"enterprise", tier:"ENTERPRISE", price:"$4,999", color:G,
    items:["Everything in Growth","Compliance Package","Priority 24h","Dedicated Verifier"],
  },
];

const COMING_SOON = ["CARD", "APPLE PAY", "GOOGLE PAY", "KLARNA"];

export function WyomingSection({ onSelectTier, onBrowse }: WyomingSectionProps) {
  return (
    <div style={{ marginBottom:"1.25rem" }}>
      <Label>Wyoming LLC Formation</Label>
      <div style={{ padding:"1rem 1.125rem", borderRadius:8,
                     background:"linear-gradient(135deg,rgba(59,130,246,0.07),rgba(139,92,246,0.04))",
                     border:`1px solid ${B}25` }}>
        <div style={{ display:"flex", alignItems:"center", gap:"0.5rem",
                       marginBottom:"0.625rem" }}>
          <div style={{ padding:"0.25rem 0.625rem", borderRadius:3,
                         background:`${B}18`, border:`1px solid ${B}35`,
                         fontFamily:M, fontSize:"0.6rem", fontWeight:900,
                         color:B, letterSpacing:"0.12em", textTransform:"uppercase" }}>
            TOKENIZE YOUR BUSINESS
          </div>
        </div>
        <h2 style={{ fontFamily:S, fontSize:"clamp(0.95rem,2.5vw,1.35rem)",
                      fontWeight:800, color:W, margin:"0 0 0.375rem",
                      letterSpacing:"-0.01em" }}>
          Launch your business on-chain.
        </h2>
        <p style={{ fontFamily:S, fontSize:"0.78rem",
                     color:"rgba(255,255,255,0.4)", lineHeight:1.6,
                     maxWidth:560, margin:"0 0 0.75rem" }}>
          Wyoming LLC for on-chain ownership, governance, fundraising, and lending.
        </p>

        {/* Payment strip */}
        <div style={{ padding:"0.5rem 0.75rem", borderRadius:5,
                       background:`${G}07`, border:`1px solid ${G}20`,
                       marginBottom:"0.875rem",
                       display:"flex", alignItems:"center",
                       gap:"0.5rem", flexWrap:"wrap" }}>
          <div style={{ display:"flex", alignItems:"center", gap:"0.375rem" }}>
            <div style={{ width:6, height:6, borderRadius:"50%", background:G }} />
            <span style={{ fontFamily:M, fontSize:"0.55rem", fontWeight:700,
                            color:G, letterSpacing:"0.08em" }}>
              USDC · SOLANA
            </span>
          </div>
          <span style={{ fontFamily:S, fontSize:"0.7rem",
                          color:"rgba(255,255,255,0.4)" }}>
            Send to circuit.skr treasury wallet
          </span>
          <div style={{ display:"flex", gap:"0.25rem", flexWrap:"wrap",
                         marginLeft:"auto", opacity:0.4 }}>
            {COMING_SOON.map(m => (
              <div key={m}
                style={{ padding:"1px 6px", borderRadius:2,
                          background:"rgba(255,255,255,0.04)",
                          border:"1px solid rgba(255,255,255,0.08)",
                          fontFamily:M, fontSize:"0.44rem",
                          color:"rgba(255,255,255,0.3)",
                          letterSpacing:"0.04em" }}>
                {m} · COMING SOON
              </div>
            ))}
          </div>
        </div>

        {/* Tier cards */}
        <div style={{ display:"flex", gap:"0.625rem", marginBottom:"1rem",
                       overflowX:"auto", paddingBottom:"0.25rem",
                       scrollSnapType:"x mandatory" }}>
          {TIERS.map(pkg => (
            <div key={pkg.tier}
              style={{ minWidth:200, flex:"0 0 200px",
                        padding:"0.875rem", borderRadius:6,
                        background:CARD,
                        border:`1px solid ${pkg.color}25`,
                        borderTop:`2px solid ${pkg.color}`,
                        display:"flex", flexDirection:"column",
                        scrollSnapAlign:"start" }}>
              <div style={{ fontFamily:M, fontSize:"0.62rem", fontWeight:900,
                             color:pkg.color, letterSpacing:"0.1em",
                             marginBottom:"0.2rem" }}>
                {pkg.tier}
              </div>
              <div style={{ fontFamily:M, fontSize:"1.05rem", fontWeight:900,
                             color:W, marginBottom:"0.5rem" }}>
                {pkg.price}
              </div>
              <div style={{ flex:1, marginBottom:"0.625rem" }}>
                {pkg.items.map(item => (
                  <div key={item}
                    style={{ display:"flex", gap:"0.4rem",
                              alignItems:"flex-start", marginBottom:3 }}>
                    <span style={{ color:pkg.color, fontSize:"0.6rem",
                                    flexShrink:0, marginTop:2 }}>
                      {"\u25c9"}
                    </span>
                    <span style={{ fontFamily:S, fontSize:"0.72rem",
                                    color:"rgba(255,255,255,0.5)",
                                    lineHeight:1.4 }}>
                      {item}
                    </span>
                  </div>
                ))}
              </div>
              <button
                onClick={() => onSelectTier(pkg.id)}
                style={{ width:"100%", padding:"0.5rem 0.625rem",
                          borderRadius:4,
                          border:`1px solid ${pkg.color}55`,
                          background:`${pkg.color}12`,
                          color:pkg.color, fontFamily:M, fontSize:"0.68rem",
                          fontWeight:900, cursor:"pointer",
                          letterSpacing:"0.06em", textTransform:"uppercase" }}>
                SELECT
              </button>
            </div>
          ))}
        </div>

        <button
          onClick={onBrowse}
          style={{ padding:"0.55rem 1.125rem", borderRadius:5, border:"none",
                    background:G, color:"#000", fontFamily:M, fontSize:"0.78rem",
                    fontWeight:900, cursor:"pointer", letterSpacing:"0.05em",
                    textTransform:"uppercase",
                    boxShadow:`0 0 12px ${G}45` }}>
          BROWSE TIERS
        </button>
      </div>
    </div>
  );
}
