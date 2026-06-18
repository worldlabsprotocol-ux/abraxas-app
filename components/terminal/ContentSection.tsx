"use client";
// FILE: components/terminal/ContentSection.tsx
// Deal pipeline, submit CTA, protocol milestones, asset registry card.

import { M, S, G, A, B, W, BDR, CARD } from "./tokens";
import { DealsProgress } from "./DealsProgress";
import { Label, Divider, Button, ScrollFade } from "./ui";

interface ContentSectionProps {
  onSubmit: () => void;
  onTrust: () => void;
  onRegistry: () => void;
}

const MILESTONES = [
  {
    phase:"COMPLETE", color:G,
    items:["W3C VC credential infrastructure","Wyoming LLC formation flow","V5 10-stage asset pipeline",
           "Music royalty audit intake","Cielo Sunrise AAS-1 verified","AbraxasPassport UI","Stripe payment rails"],
  },
  {
    phase:"IN PROGRESS", color:A,
    items:["Veriff biometric IDV activation","Live credential issuance","World Studios KC site identified","LifeWay IP rights negotiation"],
  },
  {
    phase:"NEXT", color:B,
    items:["Utilia MPC custody integration","OID4VP passport portability","DocuSign LLC automation","First external protocol integration"],
  },
];

export function ContentSection({ onSubmit, onTrust, onRegistry }: ContentSectionProps) {
  return (
    <div>
      {/* Deal Pipeline Progress */}
      <DealsProgress />

      <Divider />

      {/* Submit CTA */}
      <ScrollFade>
        <div style={{ padding:"2rem", borderRadius:8,
                       border:`1px solid ${B}25`, background:`${B}05`,
                       textAlign:"center", marginBottom:"1.5rem" }}>
          <div style={{ fontFamily:M, fontSize:"0.7rem",
                         color:`${B}80`, textTransform:"uppercase",
                         letterSpacing:"0.2em", marginBottom:"0.625rem" }}>
            BRING AN ASSET INTO THE PROTOCOL
          </div>
          <h2 style={{ fontFamily:S, fontSize:"clamp(1.1rem,2.5vw,1.5rem)",
                        fontWeight:800, color:W, margin:"0 0 0.625rem",
                        letterSpacing:"-0.02em" }}>
            Verification before tokenization.
          </h2>
          <p style={{ fontFamily:S, fontSize:"clamp(0.72rem,1.5vw,0.84rem)",
                       color:"rgba(255,255,255,0.38)", lineHeight:1.75,
                       maxWidth:540, margin:"0 auto 1.25rem" }}>
            Submit your real estate, mineral rights, royalty stream, book,
            or other income-producing asset. Our team verifies it before
            anything gets tokenized.
          </p>
          <div style={{ display:"flex", gap:"0.625rem", flexWrap:"wrap",
                         justifyContent:"center" }}>
            <Button onClick={onSubmit} color={G} size="md">
              START ONBOARDING
            </Button>
            <Button onClick={onTrust} variant="outline" color={W} size="md">
              VIEW TRUST LAYER
            </Button>
          </div>
        </div>
      </ScrollFade>

      <Divider />

      {/* Protocol Milestones */}
      <ScrollFade>
        <div style={{ marginBottom:"1.5rem" }}>
          <Label>Protocol Milestones</Label>
          <div style={{ display:"flex", flexDirection:"column", gap:0 }}>
            {MILESTONES.map(ms => (
              <div key={ms.phase}
                style={{ display:"flex", gap:0 }}>
                <div style={{ width:2, background:`${ms.color}30`,
                               flexShrink:0, position:"relative" }}>
                  <div style={{ width:10, height:10, borderRadius:"50%",
                                 background:ms.color,
                                 position:"absolute", top:12, left:-4,
                                 boxShadow:`0 0 6px ${ms.color}` }} />
                </div>
                <div style={{ paddingLeft:"1.25rem", paddingBottom:"1.25rem",
                               flex:1 }}>
                  <div style={{ fontFamily:M, fontSize:"0.58rem", fontWeight:700,
                                 color:ms.color, letterSpacing:"0.14em",
                                 textTransform:"uppercase",
                                 marginBottom:"0.5rem", marginTop:"0.125rem" }}>
                    {ms.phase}
                  </div>
                  <div style={{ display:"flex", flexWrap:"wrap", gap:"0.3rem" }}>
                    {ms.items.map(item => (
                      <div key={item}
                        style={{ padding:"0.25rem 0.625rem", borderRadius:4,
                                  background:`${ms.color}08`,
                                  border:`1px solid ${ms.color}20`,
                                  fontFamily:S, fontSize:"0.7rem",
                                  color:"rgba(255,255,255,0.55)",
                                  lineHeight:1.4 }}>
                        {ms.phase === "COMPLETE" ? "\u2713 " : ""}{item}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </ScrollFade>

      <Divider />

      {/* Asset Registry */}
      <ScrollFade>
        <div style={{ marginBottom:"1.5rem" }}>
          <div style={{ display:"flex", alignItems:"baseline",
                         justifyContent:"space-between",
                         flexWrap:"wrap", gap:"0.92rem",
                         marginBottom:"1.25rem" }}>
            <Label>Asset Registry</Label>
            <Button onClick={onRegistry} variant="outline" color={B} size="sm">
              VIEW REGISTRY
            </Button>
          </div>
          <div onClick={onRegistry}
            style={{ padding:"1.375rem 1.5rem", borderRadius:8,
                      border:`1px solid ${G}25`, background:`${G}05`,
                      display:"flex", justifyContent:"space-between",
                      alignItems:"center", flexWrap:"wrap",
                      gap:"0.92rem", cursor:"pointer" }}>
            <div>
              <div style={{ display:"flex", alignItems:"center",
                             gap:"0.92rem", marginBottom:"0.7rem" }}>
                <span style={{ fontFamily:M, fontSize:"0.65rem",
                                color:`${G}60`, textTransform:"uppercase",
                                letterSpacing:"0.12em" }}>
                  AAS-1 · GENESIS ASSET
                </span>
                <span style={{ fontFamily:M, fontSize:"0.6rem", fontWeight:700,
                                color:G, background:`${G}15`,
                                border:`1px solid ${G}30`, borderRadius:3,
                                padding:"1px 6px", textTransform:"uppercase",
                                letterSpacing:"0.08em" }}>
                  VERIFIED
                </span>
              </div>
              <div style={{ fontFamily:S,
                             fontSize:"clamp(0.85rem,2vw,1.05rem)",
                             fontWeight:700, color:W }}>
                Cielo Sunrise · $1,100,000
              </div>
              <div style={{ fontFamily:S,
                             fontSize:"clamp(0.64rem,1.3vw,0.76rem)",
                             color:"rgba(255,255,255,0.32)", marginTop:"0.2rem" }}>
                Mineral Bluff, Georgia · 89/100 collateral score ·
                $660K max borrow · 96% verification confidence
              </div>
            </div>
            <span style={{ fontFamily:M, fontSize:"0.82rem",
                            color:G, letterSpacing:"0.06em" }}>
              INSPECT
            </span>
          </div>
        </div>
      </ScrollFade>

      <div style={{ height:"3rem" }} />
    </div>
  );
}
