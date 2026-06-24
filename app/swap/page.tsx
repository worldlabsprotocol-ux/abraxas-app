"use client";
// FILE: app/swap/page.tsx
// Standalone swap utility, deliberately separate from /terminal's
// investment and deal-pipeline flows, not embedded inside or next to
// them. A general crypto utility for anyone, not tied to verified-asset
// investing on Abraxas.
//
// SETUP NEEDED FROM YOU: register as a HeroSwap affiliate at
// https://heroswap.com/referrals to get your affiliate name, then
// replace AFFILIATE_NAME below. Until then this uses HeroSwap's
// default embed, which still works, you just won't earn the 50% fee
// share on swaps until you register.

import { BottomNav } from "@/components/BottomNav";

const AFFILIATE_NAME = "heroswap"; // replace with your real affiliate name once registered

export default function SwapPage() {
  return (
    <div style={{ minHeight:"100vh", background:"#FAFAF8", color:"#15151A" }}>
      <div style={{ padding:"1rem clamp(1rem,3vw,1.5rem)",
                     borderBottom:"1px solid #E5E5E0",
                     display:"flex", alignItems:"center", gap:"0.5rem" }}>
        <svg width={20} height={20} viewBox="0 0 40 40" fill="none">
          <polygon points="20,2 38,20 20,38 2,20" stroke="#10B981" strokeWidth="2" fill="none"/>
          <polygon points="20,8 32,20 20,32 8,20" stroke="#10B981" strokeWidth="1.5" fill="rgba(16,185,129,0.1)"/>
          <circle cx="20" cy="20" r="3" fill="#10B981"/>
        </svg>
        <span style={{ fontFamily:"'Inter',system-ui,sans-serif",
                        fontSize:"0.85rem", fontWeight:700 }}>
          Swap
        </span>
      </div>

      <div style={{ maxWidth:480, margin:"0 auto", padding:"2rem clamp(1rem,3vw,1.5rem)" }}>
        <div style={{ fontFamily:"'Inter',system-ui,sans-serif", fontSize:"0.72rem",
                       color:"#10B981", marginBottom:"0.5rem" }}>
          General crypto utility
        </div>
        <h1 style={{ fontFamily:"'Inter',system-ui,sans-serif", fontSize:"1.4rem",
                      fontWeight:700, margin:"0 0 0.75rem" }}>
          Swap any crypto, instantly.
        </h1>
        <p style={{ fontFamily:"'Inter',system-ui,sans-serif", fontSize:"0.82rem",
                     color:"rgba(21,21,26,0.5)", lineHeight:1.65,
                     margin:"0 0 1rem" }}>
          Cross-chain swaps, no signup, no login required. This is a
          general-purpose tool powered by HeroSwap, separate from
          Abraxas's verified asset investing, those still go through
          identity verification, this doesn't.
        </p>
        <p style={{ fontFamily:"'Inter',system-ui,sans-serif", fontSize:"0.78rem",
                     color:"rgba(21,21,26,0.45)", lineHeight:1.65,
                     margin:"0 0 1.5rem" }}>
          Why it's here: every network has its own token, and moving
          between them usually means a separate app, a separate
          balance, a separate headache. This swap moves across chains
          in one place, no juggling five wallets just to hold what you
          actually want.
        </p>

        <div style={{ borderRadius:14, overflow:"hidden",
                       border:"1px solid #E5E5E0", minHeight:560 }}>
          <iframe
            src={`https://heroswap.com/?affiliateName=${AFFILIATE_NAME}&theme=dark-black`}
            style={{ width:"100%", height:560, border:"none" }}
            title="HeroSwap"
          />
        </div>

        <div style={{ fontFamily:"'Inter',system-ui,sans-serif", fontSize:"0.66rem",
                       color:"rgba(21,21,26,0.3)", marginTop:"1rem",
                       lineHeight:1.6 }}>
          Powered by HeroSwap, a third-party service. Abraxas doesn't hold
          your funds during a swap and doesn't verify identity for this
          tool, it's a separate utility from the rest of the platform.
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
