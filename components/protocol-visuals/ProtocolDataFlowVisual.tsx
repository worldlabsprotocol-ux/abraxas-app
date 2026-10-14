import { HOMEPAGE_PROTOCOL_VISUAL_ASSETS } from "@/lib/home/homepageProtocolVisualAssets";
import { ProtocolDiagramFigure } from "./ProtocolDiagramFigure";
import { ProtocolVisualShell } from "./ProtocolVisualShell";

export function ProtocolDataFlowVisual() {
  return (
    <ProtocolVisualShell
      id="how-abraxas-works"
      kicker="01 System"
      title="Secure verification"
      titleAccent="flow"
      caption="Private evidence stays in your boundary. Abraxas returns scoped signed results — not raw identity fields."
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
