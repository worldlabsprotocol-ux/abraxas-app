import { ProtocolDiagramFigure } from "./ProtocolDiagramFigure";
import { ProtocolVisualShell } from "./ProtocolVisualShell";

export function DecisionReceiptInspectionVisual() {
  return (
    <ProtocolVisualShell
      id="verify-the-decision"
      title="Verify the Decision"
      className="abx-pv-shell--exhibit abx-pv-shell--open"
    >
      <ProtocolDiagramFigure
        src="/protocol-visuals/decision-receipt-inspection.webp"
        alt="Receipt inspection diagram showing valid versus revoked paths across signature, policy, issuer, and revocation checks."
        width={1920}
        height={1080}
      />
    </ProtocolVisualShell>
  );
}
