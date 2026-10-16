import { ProtocolVisualShell } from "./ProtocolVisualShell";
import { PassportHolderFlowStepsMotion } from "./PassportHolderFlowStepsMotion";

/** Holder-facing flow — no backend claims, plain language. */
export function PassportHolderFlowVisual() {
  return (
    <ProtocolVisualShell
      kicker="Passport"
      title="You control"
      titleAccent="what leaves."
      caption="Verify once. Reuse signed eligibility answers across participating apps."
      className="abx-pv-passport-flow"
    >
      <PassportHolderFlowStepsMotion />
    </ProtocolVisualShell>
  );
}
