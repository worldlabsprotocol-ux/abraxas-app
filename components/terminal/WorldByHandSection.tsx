"use client";
// FILE: components/terminal/WorldByHandSection.tsx
// Second business being positioned for tokenization. Two separate
// asks here, kept separate on purpose: stablecoin checkout (straight-
// forward, shown as coming soon since real product/price data isn't
// wired in yet, this section doesn't fabricate products to fill space)
// and "tokenize the business for outside investors," which is a much
// heavier lift, no investor CTA exists here, that needs legal review
// on securities treatment before going anywhere near the public site.

import { S, G, W, BDR } from "./tokens";
import { ScrollFade } from "./ui";

export function WorldByHandSection() {
  return (
    <ScrollFade>
      <div style={{ borderRadius:12, overflow:"hidden",
                     border:`1px solid ${G}30`,
                     background:"linear-gradient(135deg,rgba(16,185,129,0.06),rgba(0,0,0,0))",
                     padding:"1.25rem 1.5rem" }}>
        <div style={{ fontFamily:S, fontSize:"0.68rem", fontWeight:600,
                       color:G, marginBottom:"0.5rem" }}>
          Second Business in Tokenization Review
        </div>
        <div style={{ fontFamily:"Georgia,serif", fontSize:"clamp(1.1rem,2.5vw,1.4rem)",
                       fontWeight:700, color:W, marginBottom:"0.625rem" }}>
          World by Hand
        </div>
        <p style={{ fontFamily:S, fontSize:"0.8rem",
                     color:"rgba(255,255,255,0.5)", lineHeight:1.7,
                     margin:"0 0 1rem", maxWidth:560 }}>
          A real, operating retail business, handcrafted fair-trade goods
          from artisans worldwide, currently selling in roughly 140
          fiat currencies with no crypto payment option yet. Two
          separate things are being evaluated here, kept apart on purpose.
        </p>

        <div style={{ display:"flex", gap:"0.75rem", flexWrap:"wrap" }}>
          <div style={{ flex:"1 1 220px", padding:"0.875rem", borderRadius:10,
                         border:`1px solid ${BDR}`, background:"rgba(255,255,255,0.02)" }}>
            <div style={{ fontFamily:S, fontSize:"0.76rem", fontWeight:700,
                           color:W, marginBottom:"0.375rem" }}>
              Stablecoin checkout
            </div>
            <div style={{ fontFamily:S, fontSize:"0.7rem",
                           color:"rgba(255,255,255,0.45)", lineHeight:1.6 }}>
              Adding USDC/USDT as a payment option at checkout. Coming
              soon, real product and pricing data isn't wired in yet.
            </div>
          </div>
          <div style={{ flex:"1 1 220px", padding:"0.875rem", borderRadius:10,
                         border:`1px solid ${BDR}`, background:"rgba(255,255,255,0.02)" }}>
            <div style={{ fontFamily:S, fontSize:"0.76rem", fontWeight:700,
                           color:W, marginBottom:"0.375rem" }}>
              Tokenizing the business
            </div>
            <div style={{ fontFamily:S, fontSize:"0.7rem",
                           color:"rgba(255,255,255,0.45)", lineHeight:1.6 }}>
              Opening this to outside investors is a heavier lift than
              checkout. Under legal review before anything public.
            </div>
          </div>
        </div>
      </div>
    </ScrollFade>
  );
}
