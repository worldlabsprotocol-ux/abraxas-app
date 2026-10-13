import { ProtocolDiagramFigure } from "./ProtocolDiagramFigure";
import { ProtocolVisualShell } from "./ProtocolVisualShell";

export function PolicyAuthorizationFlowVisual() {
  return (
    <ProtocolVisualShell
      id="what-applications-receive"
      title="What Applications Receive"
      className="abx-pv-shell--exhibit abx-pv-shell--open"
    >
      <ProtocolDiagramFigure
        src="/protocol-visuals/policy-authorization-flow.webp"
        alt="Consent, policy evaluation, signed receipt, and application decision without sharing raw identity documents."
        width={1920}
        height={1080}
        decorative
      />
    </ProtocolVisualShell>
  );
}
