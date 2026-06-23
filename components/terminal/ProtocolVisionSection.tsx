"use client";
// FILE: components/terminal/ProtocolVisionSection.tsx
// "Protocol Vision" + closing "Ready to start" CTA, restored from the
// original loading page, both word for word from the original copy.

import { S, G, W, BDR } from "./tokens";
import { ScrollFade } from "./ui";

const CHAINS = [
  { name:"Solana",   live:true },
  { name:"Ethereum", live:false },
  { name:"SUI",      live:false },
  { name:"Polygon",  live:false },
  { name:"Arbitrum", live:false },
  { name:"Base",     live:false },
];

interface ProtocolVisionSectionProps {
  onGetStarted: () => void;
}

export function ProtocolVisionSection({ onGetStarted }: ProtocolVisionSectionProps) {
  return (
    <div>
      <ScrollFade>
        <div style={{ marginBottom:"2rem" }}>
          <div style={{ fontFamily:S, fontSize:"0.68rem", fontWeight:600,
                         color:G, marginBottom:"0.5rem" }}>
            Protocol vision
          </div>
          <div style={{ fontFamily:S, fontSize:"clamp(1.1rem,2.5vw,1.4rem)",
                         fontWeight:700, color:W, marginBottom:"0.875rem" }}>
            One passport. Every blockchain.
          </div>
          <p style={{ fontFamily:S, fontSize:"0.85rem",
                       color:"rgba(255,255,255,0.5)", lineHeight:1.75,
                       maxWidth:600, margin:"0 0 1.25rem" }}>
            Abraxas is building the universal identity and verification
            layer that sits between blockchains. Verify once on Abraxas.
            Present your credential to any protocol on any chain, without
            re-KYC, without re-uploading documents, without friction.
          </p>
          <div style={{ display:"flex", gap:"0.5rem", flexWrap:"wrap" }}>
            {CHAINS.map(c => (
              <div key={c.name}
                style={{ display:"flex", alignItems:"center", gap:"0.375rem",
                          padding:"0.4rem 0.75rem", borderRadius:20,
                          background: c.live ? `${G}12` : "rgba(255,255,255,0.03)",
                          border: c.live ? `1px solid ${G}35` : `1px solid ${BDR}` }}>
                {c.live && <span style={{ color:G, fontSize:"0.7rem" }}>✓</span>}
                <span style={{ fontFamily:S, fontSize:"0.72rem", fontWeight:600,
                                color: c.live ? G : "rgba(255,255,255,0.4)" }}>
                  {c.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      </ScrollFade>

      <ScrollFade>
        <div style={{ textAlign:"center", padding:"2.5rem 1.5rem",
                       borderRadius:16,
                       background:"rgba(16,185,129,0.08)",
                       border:`1px solid ${G}30` }}>
          <div style={{ fontFamily:S, fontSize:"0.68rem", fontWeight:600,
                         color:G, marginBottom:"0.5rem" }}>
            Ready to start
          </div>
          <div style={{ fontFamily:S, fontSize:"clamp(1.2rem,3vw,1.7rem)",
                         fontWeight:700, color:W, marginBottom:"0.75rem" }}>
            Verify once. Deploy everywhere.
          </div>
          <p style={{ fontFamily:S, fontSize:"0.85rem",
                       color:"rgba(255,255,255,0.5)", lineHeight:1.7,
                       maxWidth:480, margin:"0 auto 1.5rem" }}>
            Join the asset owners, artists, and builders already building
            on the Abraxas Protocol.
          </p>
          <button onClick={onGetStarted}
            style={{ padding:"0.85rem 2rem", borderRadius:8, border:"none",
                      background:G, color:"#000", fontFamily:S,
                      fontSize:"0.9rem", fontWeight:700, cursor:"pointer" }}>
            Get started →
          </button>
        </div>
      </ScrollFade>
    </div>
  );
}
