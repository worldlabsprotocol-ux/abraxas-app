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
        alt="Five-step flow: user consent in private space, policy request, Abraxas evaluation, signed receipt, and app decision."
        width={1920}
        height={1080}
      />
    </ProtocolVisualShell>
  );
}
