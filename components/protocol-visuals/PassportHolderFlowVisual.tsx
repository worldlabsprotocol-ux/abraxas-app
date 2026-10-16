import { ProtocolVisualShell } from "./ProtocolVisualShell";
import { PassportHolderFlowStepsMotion } from "./PassportHolderFlowStepsMotion";

/** Holder-facing flow — no backend claims, plain language. */
export function PassportHolderFlowVisual() {
  return (
    <ProtocolVisualShell
      kicker="Passport"
      title="You control"
      titleAccent="what leaves."
      caption="Participating apps receive scoped eligibility answers when you consent and policy authorizes—never automatic access across unrelated apps."
      className="abx-pv-passport-flow"
    >
      <PassportHolderFlowStepsMotion />
    </ProtocolVisualShell>
  );
}
