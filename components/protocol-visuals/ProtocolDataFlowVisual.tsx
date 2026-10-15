import { HOMEPAGE_PROTOCOL_VISUAL_ASSETS } from "@/lib/home/homepageProtocolVisualAssets";
import { ProtocolDiagramFigure } from "./ProtocolDiagramFigure";
import { ProtocolVisualShell } from "./ProtocolVisualShell";

export function ProtocolDataFlowVisual() {
  return (
    <ProtocolVisualShell
      id="how-abraxas-works"
      kicker="Protocol flow"
      title="Passport to"
      titleAccent="partner verify"
      caption="Holder evidence stays in the protected domain. Passport composes policy-scoped presentations; partners verify signed receipts and authenticated revocation locally."
      className="abx-pv-shell--exhibit abx-pv-shell--open"
    >
      <ProtocolDiagramFigure
        src={HOMEPAGE_PROTOCOL_VISUAL_ASSETS.secureVerificationFlow}
        alt="Private credentials stay with you while Abraxas returns signed verification results to applications."
        width={1920}
        height={1080}
        priority
        decorative
      />
    </ProtocolVisualShell>
  );
}
