import { HOMEPAGE_PROTOCOL_VISUAL_ASSETS } from "@/lib/home/homepageProtocolVisualAssets";
import { ProtocolDiagramFigure } from "./ProtocolDiagramFigure";
import { ProtocolVisualShell } from "./ProtocolVisualShell";

export function PolicyAuthorizationFlowVisual() {
  return (
    <ProtocolVisualShell
      id="private-data-consent-flow"
      kicker="02 Authorization"
      title="Private data &"
      titleAccent="consent flow"
      caption="Consent, policy evaluation, and signed receipt — only scoped output crosses your private boundary."
      className="abx-pv-shell--exhibit abx-pv-shell--open"
    >
      <ProtocolDiagramFigure
        src={HOMEPAGE_PROTOCOL_VISUAL_ASSETS.privateDataConsentFlow}
        alt="Consent, policy evaluation, signed receipt, and application decision without sharing raw identity documents."
        width={1920}
        height={1080}
        decorative
      />
    </ProtocolVisualShell>
  );
}
