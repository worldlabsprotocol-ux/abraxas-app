import { ProtocolDiagramFigure } from "./ProtocolDiagramFigure";
import { ProtocolVisualShell } from "./ProtocolVisualShell";

export function PolicyAuthorizationFlowVisual() {
  return (
    <ProtocolVisualShell
      kicker="Authorization"
      title="Policy-specific"
      titleAccent="decisions."
      caption="Consent → policy check → evaluation → signed receipt → app decision. Private data stays inside your boundary."
    >
      <ProtocolDiagramFigure
        src="/protocol-visuals/policy-authorization-flow.webp"
        alt="Five-step flow: user consent in private space, policy request, Abraxas evaluation, signed receipt, and app decision."
        width={1920}
        height={1080}
      />
    </ProtocolVisualShell>
  );
}
