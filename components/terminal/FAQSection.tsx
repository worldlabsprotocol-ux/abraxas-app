"use client";
// FILE: components/terminal/FAQSection.tsx
// From my very first audit, this was recommended and never actually
// built: a short FAQ addressing the obvious skeptical questions. This
// closes that gap for real.

import { useState } from "react";
import { S, G, W, BDR } from "./tokens";
import { ScrollFade } from "./ui";

const FAQS = [
  {
    q: "Is this legal?",
    a: "Abraxas's investment offerings are structured under Reg D 506(c), a real SEC exemption for accredited-investor offerings. The platform itself isn't a broker-dealer or bank, it's a verification and credential layer. Each individual asset's offering documents specify the exact legal structure.",
  },
  {
    q: "What happens to my money?",
    a: "For investments and purchases, you send stablecoin directly to the treasury wallet, our team confirms the transfer on-chain and follows up by email, typically within one business day. Nothing is automated yet, every transaction is reviewed by a person before anything is finalized.",
  },
  {
    q: "Who's behind this?",
    a: "Abraxas is built by a solo founder with a decade in crypto, real estate, and asset structuring. World Labs, the founder's own company, was the first business put through the platform's full verification process, the same standard every other business and asset is held to.",
  },
  {
    q: "What if I send money and never hear back?",
    a: "That shouldn't happen, typical confirmation time is same day to one business day. If it does, every action on the platform records your email, so there's always a paper trail to follow up on.",
  },
  {
    q: "Do I need to know anything about crypto to use this?",
    a: "No. Sign in with email, Abraxas creates a wallet for you behind the scenes. The word \"wallet\" only matters if you choose to connect one yourself.",
  },
];

export function FAQSection() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <ScrollFade>
      <div>
        <div style={{ fontFamily:S, fontSize:"0.95rem", fontWeight:700,
                       color:W, marginBottom:"1rem" }}>
          Common questions
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:"0.5rem" }}>
          {FAQS.map((item, i) => (
            <div key={item.q} style={{ borderRadius:10, border:`1px solid ${BDR}`,
                                         background:"rgba(255,255,255,0.02)",
                                         overflow:"hidden" }}>
              <button onClick={() => setOpen(open === i ? null : i)}
                style={{ width:"100%", padding:"0.875rem 1rem", background:"none",
                          border:"none", display:"flex", justifyContent:"space-between",
                          alignItems:"center", cursor:"pointer", textAlign:"left" }}>
                <span style={{ fontFamily:S, fontSize:"0.85rem", fontWeight:600, color:W }}>
                  {item.q}
                </span>
                <span style={{ color:G, fontSize:"0.7rem",
                                transform: open === i ? "rotate(180deg)" : "rotate(0deg)",
                                transition:"transform 0.2s" }}>
                  ▾
                </span>
              </button>
              <div style={{ maxHeight: open === i ? 200 : 0, opacity: open === i ? 1 : 0,
                             overflow:"hidden", transition:"max-height 0.3s, opacity 0.2s" }}>
                <div style={{ padding:"0 1rem 1rem", fontFamily:S, fontSize:"0.8rem",
                               color:"rgba(255,255,255,0.5)", lineHeight:1.65 }}>
                  {item.a}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </ScrollFade>
  );
}
