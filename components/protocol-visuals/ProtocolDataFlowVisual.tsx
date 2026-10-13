import { ProtocolDiagramFigure } from "./ProtocolDiagramFigure";
import { ProtocolVisualShell } from "./ProtocolVisualShell";

export function ProtocolDataFlowVisual() {
  return (
    <ProtocolVisualShell
      id="how-abraxas-works"
      kicker="System"
      title="Verify once."
      titleAccent="Share narrow answers."
      caption="Your credentials stay in your private space. Apps receive signed results — not copies of your documents."
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
