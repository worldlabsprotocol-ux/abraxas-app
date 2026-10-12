import { ProtocolDiagramFigure } from "./ProtocolDiagramFigure";
import { ProtocolVisualShell } from "./ProtocolVisualShell";

export function DecisionReceiptInspectionVisual() {
  return (
    <ProtocolVisualShell
      kicker="Verification"
      title="Decision receipt"
      titleAccent="inspection."
      caption="Each check maps to a verifier step — signature, policy, issuer, freshness, revocation, replay."
    >
      <ProtocolDiagramFigure
        src="/protocol-visuals/decision-receipt-inspection.png"
        alt="Receipt inspection diagram showing valid versus revoked paths across signature, policy, issuer, and revocation checks."
        width={1920}
        height={1080}
      />
    </ProtocolVisualShell>
  );
}
