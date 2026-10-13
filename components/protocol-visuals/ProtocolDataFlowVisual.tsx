import { ProtocolDiagramFigure } from "./ProtocolDiagramFigure";
import { ProtocolVisualShell } from "./ProtocolVisualShell";

export function ProtocolDataFlowVisual() {
  return (
    <ProtocolVisualShell
      id="how-abraxas-works"
      title="How Abraxas Works"
      className="abx-pv-shell--exhibit"
    >
      <ProtocolDiagramFigure
        src="/protocol-visuals/abraxas-protocol-data-flow.webp"
        alt="Diagram: your private credentials flow through Abraxas Protocol to apps that receive only signed verification results such as over 21 or KYC verified."
        width={1920}
        height={1080}
      />
    </ProtocolVisualShell>
  );
}
