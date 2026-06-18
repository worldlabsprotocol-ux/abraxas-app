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

      {/* Asset Registry */}
      <ScrollFade>
        <div id="demo-registry" style={{ marginBottom:"1.5rem" }}>
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
