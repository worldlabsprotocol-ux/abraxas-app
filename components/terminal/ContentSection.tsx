"use client";
// FILE: components/terminal/ContentSection.tsx
// Deal pipeline, submit CTA, protocol milestones, asset registry card.

import { M, S, G, A, B, W, BDR, CARD } from "./tokens";
import { DealsProgress } from "./DealsProgress";
import { SubmitAssetDemo } from "./SubmitAssetDemo";
import { Label, Divider, Button, ScrollFade } from "./ui";

interface ContentSectionProps {
  onSubmit: () => void;
  onTrust: () => void;
}

export function ContentSection({ onSubmit, onTrust }: ContentSectionProps) {
  return (
    <div>
      {/* Deal Pipeline Progress */}
      <div id="deal-pipeline">
        <DealsProgress />
      </div>

      <Divider />

      {/* Inline auto-cycling demo of the submission flow */}
      <ScrollFade>
        <div style={{ marginBottom:"1.5rem" }}>
          <SubmitAssetDemo onStart={onSubmit} />
        </div>
      </ScrollFade>

      <Divider />

      {/* Trust layer CTA */}
      <ScrollFade>
        <div style={{ padding:"2rem", borderRadius:16,
                       border:`1px solid ${B}25`, background:`${B}05`,
                       textAlign:"center", marginBottom:"1.5rem" }}>
          <h2 style={{ fontFamily:S, fontSize:"clamp(1.1rem,2.5vw,1.5rem)",
                        fontWeight:700, color:W, margin:"0 0 0.625rem" }}>
            Verification before tokenization.
          </h2>
          <p style={{ fontFamily:S, fontSize:"clamp(0.78rem,1.5vw,0.88rem)",
                       color:"rgba(21,21,26,0.45)", lineHeight:1.75,
                       maxWidth:540, margin:"0 auto 1.25rem" }}>
            Every asset on Abraxas is checked by our team before it is ever
            tokenized. Real estate, mineral rights, royalty streams, books,
            or any income-producing asset.
          </p>
          <Button onClick={onTrust} variant="outline" color={W} size="md">
            View the trust layer
          </Button>
        </div>
      </ScrollFade>

      <div style={{ height:"3rem" }} />
    </div>
  );
}
