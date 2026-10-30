// A single, responsive account of the public trust flow. This is explanatory, not live state.
import Image from "next/image";
import { HomeProtocolVisualDisclosure } from "@/components/home/HomeProtocolVisualDisclosure";

const steps = [
  {
    number: "01",
    title: "Application request",
    detail: "A partner asks about one action under a defined policy.",
    signal: "Action + policy + audience",
  },
  {
    number: "02",
    title: "Authorized evidence",
    detail: "The holder shares only the evidence needed. Abraxas checks its integrity and issuer authority.",
    signal: "Evidence + consent + authority",
  },
  {
    number: "03",
    title: "Signed decision",
    detail: "Abraxas evaluates the policy and issues a signed, bound result.",
    signal: "Policy-bound proof",
  },
  {
    number: "04",
    title: "Verify and enforce",
    detail: "The partner independently checks the signature, binding, and current status before acting.",
    signal: "Permit · Deny · Indeterminate",
  },
] as const;

export function HomeTrustContinuousArchitectureImage({ priority = false }: { priority?: boolean }) {
  return (
    <figure className="abx-trust-continuous-arch" aria-labelledby="abx-trust-continuous-arch-title">
      <figcaption className="abx-trust-continuous-arch__caption">
        <p className="abx-v2-eyebrow">How Abraxas works</p>
        <h2 id="abx-trust-continuous-arch-title" className="abx-trust-continuous-arch__title">Trust is continuous.</h2>
        <p className="abx-trust-continuous-arch__lead">One request. A verifiable decision. Your application stays in control.</p>
      </figcaption>
      <ol className="abx-trust-continuous-arch__flow" aria-label="Verification flow">
        {steps.map((step, index) => (
          <li className="abx-trust-continuous-arch__step" key={step.number}>
            <div className="abx-trust-continuous-arch__step-top">
              <span className="abx-trust-continuous-arch__step-number">{step.number}</span>
              {index === 2 && <Image src="/brand/official/abraxas-emblem-protocol-640.webp" alt="" aria-hidden width={52} height={52} priority={priority} className="abx-trust-continuous-arch__emblem" />}
            </div>
            <h3>{step.title}</h3>
            <p>{step.detail}</p>
            <span className="abx-trust-continuous-arch__signal">{step.signal}</span>
          </li>
        ))}
      </ol>
      <p className="abx-trust-continuous-arch__continuity"><strong>Continuity</strong> · An authentic signature alone does not mean the result is still acceptable. The partner checks expiration, revocation, and freshness at enforcement.</p>
      <HomeProtocolVisualDisclosure />
    </figure>
  );
}
