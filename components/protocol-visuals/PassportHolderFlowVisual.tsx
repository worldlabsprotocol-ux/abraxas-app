import { ProtocolVisualShell } from "./ProtocolVisualShell";

const STEPS = [
  { n: "01", title: "Your vault", body: "Credentials stay with you." },
  { n: "02", title: "Consent", body: "You approve each share." },
  { n: "03", title: "Signed proof", body: "Narrow answer only." },
  { n: "04", title: "Reuse", body: "Same proof, new app." },
] as const;

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
      <ol className="abx-pv-passport-flow__steps">
        {STEPS.map((step, i) => (
          <li key={step.n} className="abx-pv-passport-flow__step">
            <span className="abx-pv-passport-flow__index">{step.n}</span>
            <div>
              <strong>{step.title}</strong>
              <span>{step.body}</span>
            </div>
            {i < STEPS.length - 1 ? <span className="abx-pv-passport-flow__connector" aria-hidden="true" /> : null}
          </li>
        ))}
      </ol>
    </ProtocolVisualShell>
  );
}
