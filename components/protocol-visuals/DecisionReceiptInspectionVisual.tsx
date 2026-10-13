import { ProtocolDiagramFigure } from "./ProtocolDiagramFigure";
import { ProtocolVisualShell } from "./ProtocolVisualShell";

export function DecisionReceiptInspectionVisual() {
  return (
    <ProtocolVisualShell
      kicker="Verification"
      title="Decision receipt"
      titleAccent="inspection."
      caption="Reference diagram — use the workbench below for interactive valid, expired, revoked, and unavailable scenarios (simulated)."
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
