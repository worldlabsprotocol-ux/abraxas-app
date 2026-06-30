"use client";
// FILE: components/terminal/FAQSection.tsx
// Replaces the generic FAQ with a "why" Q&A format, the questions a
// genuinely skeptical person actually asks before trusting any of
// this, not a generic terms-of-service-style FAQ list.

import { useState } from "react";
import { S, G, BDR } from "./tokens";
import { ScrollFade } from "./ui";

const FAQS = [
  {
    q: "Why tokenization?",
    a: "Because right now, proving you own something real, and proving it's actually worth what you say, takes paperwork, phone calls, and trust in a stranger's word. Tokenization turns that proof into something portable, checked once, then carried with the asset everywhere it goes.",
  },
  {
    q: "Why not just buy the asset normally?",
    a: "You still can. Abraxas doesn't replace a deed or a title, it sits on top of it. What it adds is a verified record anyone can check before they commit money, and a way to invest in or borrow against that asset using stablecoins instead of waiting on a bank.",
  },
  {
    q: "Why blockchain?",
    a: "Because a paper record can be lost, altered, or only trusted if you trust whoever's holding it. A verified Passport on Sui doesn't depend on trusting Abraxas forever — it's checkable by anyone, anytime, without calling us first.",
  },
  {
    q: "Why Abraxas?",
    a: "World Labs, the founder's own company, went through the exact same verification process before anyone else's asset did. That's not a slogan, it's the actual first thing that happened. Every asset since has been held to that same standard.",
  },
  {
    q: "What happens to my money?",
    a: "You send stablecoin directly to the treasury wallet. Internally, your transaction moves through real stages, Authorized when you confirm you've sent it, Captured once our team verifies the transfer on-chain (typically within one business day), Settled once everything is wrapped up, so this isn't a black box on our end. A self-serve status check for you to track your own transaction is coming, for now we follow up directly by email at each stage.",
  },
];

export function FAQSection() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <ScrollFade>
      <div>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
                       flexWrap:"wrap", gap:"0.5rem", marginBottom:"1rem" }}>
          <div style={{ fontFamily:S, fontSize:"0.95rem", fontWeight:700,
                         color:"var(--text-primary)" }}>
            Why this, why now
          </div>
          <a href="/faq" style={{
            fontFamily:S, fontSize:"0.72rem", fontWeight:600,
            color:G, textDecoration:"none",
          }}>
            Full FAQ →
          </a>
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:"0.5rem" }}>
          {FAQS.map((item, i) => (
            <div key={item.q} style={{ borderRadius:10, border:`1px solid ${BDR}`,
                                         background:"var(--bg)",
                                         overflow:"hidden" }}>
              <button onClick={() => setOpen(open === i ? null : i)}
                style={{ width:"100%", padding:"0.875rem 1rem", background:"none",
                          border:"none", display:"flex", justifyContent:"space-between",
                          alignItems:"center", cursor:"pointer", textAlign:"left" }}>
                <span style={{ fontFamily:S, fontSize:"0.85rem", fontWeight:600,
                                color:"var(--text-primary)" }}>
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
                               color:"var(--text-secondary)", lineHeight:1.65 }}>
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
