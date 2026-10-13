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
        alt="Private credentials stay with you while Abraxas returns signed verification results to applications."
        width={1920}
        height={1080}
        decorative
      />
    </ProtocolVisualShell>
  );
}
