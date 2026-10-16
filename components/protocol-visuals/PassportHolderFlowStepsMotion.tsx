"use client";
// FILE: components/protocol-visuals/PassportHolderFlowStepsMotion.tsx

import { Reveal } from "@/lib/motion/Reveal";

const STEPS = [
  { n: "01", title: "Your vault", body: "Credentials stay with you." },
  { n: "02", title: "Consent", body: "You approve each share." },
  { n: "03", title: "Signed proof", body: "Narrow answer only." },
  { n: "04", title: "Reuse", body: "Same proof, new app." },
] as const;

export function PassportHolderFlowStepsMotion() {
  return (
    <ol className="abx-pv-passport-flow__steps">
      {STEPS.map((step, i) => (
        <Reveal key={step.n} as="li" staggerIndex={i} motionRole="surface" tier="calm" className="abx-pv-passport-flow__step">
          <span className="abx-pv-passport-flow__index">{step.n}</span>
          <div>
            <strong>{step.title}</strong>
            <span>{step.body}</span>
          </div>
          {i < STEPS.length - 1 ? <span className="abx-pv-passport-flow__connector" aria-hidden="true" /> : null}
        </Reveal>
      ))}
    </ol>
  );
}
