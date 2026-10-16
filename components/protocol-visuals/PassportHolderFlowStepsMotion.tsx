"use client";
// FILE: components/protocol-visuals/PassportHolderFlowStepsMotion.tsx

import { Reveal } from "@/lib/motion/Reveal";

const STEPS = [
  {
    n: "01",
    title: "Holder control",
    body: "Your Passport governs custody and export—credentials are not open to every partner by default.",
  },
  {
    n: "02",
    title: "Consent",
    body: "You explicitly approve each partner request before anything is shared.",
  },
  {
    n: "03",
    title: "Scoped decision",
    body: "The relying party receives a signed, policy-bound answer—not raw identity files.",
  },
  {
    n: "04",
    title: "Authorized reuse",
    body: "Another app may reuse only with your consent, its policy, fresh checks, and no revocation.",
  },
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
