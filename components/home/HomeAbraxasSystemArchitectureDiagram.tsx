// FILE: components/home/HomeAbraxasSystemArchitectureDiagram.tsx
// Canonical four stage trust architecture (public storytelling, not live network state).

import Image from "next/image";
import { LIVING_SPHERE_BRAND } from "@/lib/brand/livingSphereBrandAssets";
import { HomeProtocolVisualDisclosure } from "@/components/home/HomeProtocolVisualDisclosure";

const EMBLEM = LIVING_SPHERE_BRAND.hero.src;

const INPUTS = ["Wallet", "Evidence", "Consent", "Policy request"] as const;

const DECISION_RING = [
  "Policy engine",
  "Signed receipt",
  "Current validity",
  "Evidence integrity",
  "Issuer authority",
] as const;

const VERIFICATION = ["Trust anchor", "SIAS", "Signed status", "Independent verifier"] as const;

const ENFORCEMENT = ["Permit", "Deny", "Indeterminate", "Trust continuity"] as const;

type DiagramVariant = "default" | "mobilePrimary";

export function HomeAbraxasSystemArchitectureDiagram({
  variant = "default",
}: {
  variant?: DiagramVariant;
}) {
  const rootClass =
    variant === "mobilePrimary"
      ? "abx-trust-arch-diagram abx-trust-arch-diagram--mobile-primary"
      : "abx-trust-arch-diagram";

  return (
    <figure className={rootClass} aria-labelledby="abx-trust-arch-title">
      <figcaption className="abx-trust-arch-diagram__caption">
        <p className="abx-v2-eyebrow">Abraxas trust architecture</p>
        <h3 id="abx-trust-arch-title" className="abx-trust-arch-diagram__title">
          Independent trust infrastructure
        </h3>
        <p className="abx-trust-arch-diagram__lead">
          Authoritative evidence in. Signed decisions out. Independent verification everywhere.
        </p>
      </figcaption>

      <div className="abx-trust-arch-diagram__grid">
        <article className="abx-trust-arch-diagram__stage abx-trust-arch-diagram__stage--inputs">
          <header>
            <span className="abx-trust-arch-diagram__index">01</span>
            <span className="abx-trust-arch-diagram__stage-name">Inputs</span>
          </header>
          <p className="abx-trust-arch-diagram__stage-lead">User and application requests</p>
          <ul className="abx-trust-arch-diagram__list">
            {INPUTS.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p className="abx-trust-arch-diagram__flow-label">Issue</p>
        </article>

        <article className="abx-trust-arch-diagram__stage abx-trust-arch-diagram__stage--decision">
          <header>
            <span className="abx-trust-arch-diagram__index">02</span>
            <span className="abx-trust-arch-diagram__stage-name">Abraxas decision layer</span>
          </header>
          <p className="abx-trust-arch-diagram__stage-lead">Process, sign, and attest</p>
          <div className="abx-trust-arch-diagram__emblem-wrap">
            <Image
              src={EMBLEM}
              alt=""
              width={120}
              height={120}
              className="abx-trust-arch-diagram__emblem"
              aria-hidden
            />
          </div>
          <ul className="abx-trust-arch-diagram__list abx-trust-arch-diagram__list--ring">
            {DECISION_RING.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p className="abx-trust-arch-diagram__flow-label">Verify</p>
        </article>

        <article className="abx-trust-arch-diagram__stage abx-trust-arch-diagram__stage--portable">
          <header>
            <span className="abx-trust-arch-diagram__index">03</span>
            <span className="abx-trust-arch-diagram__stage-name">Portable verification</span>
          </header>
          <p className="abx-trust-arch-diagram__stage-lead">Anyone can verify, anywhere</p>
          <ul className="abx-trust-arch-diagram__list">
            {VERIFICATION.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p className="abx-trust-arch-diagram__flow-label">Enforce</p>
        </article>

        <article className="abx-trust-arch-diagram__stage abx-trust-arch-diagram__stage--enforce">
          <header>
            <span className="abx-trust-arch-diagram__index">04</span>
            <span className="abx-trust-arch-diagram__stage-name">Partner enforcement</span>
          </header>
          <p className="abx-trust-arch-diagram__stage-lead">Integrate and enforce in your app</p>
          <ul className="abx-trust-arch-diagram__list abx-trust-arch-diagram__list--outcomes">
            {ENFORCEMENT.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p className="abx-trust-arch-diagram__flow-label">Trust continuity</p>
        </article>
      </div>

      <div className="abx-trust-arch-diagram__footer" aria-label="Core properties">
        <div>
          <strong>Authentic</strong>
          <span>Backed by issuer authority</span>
        </div>
        <div>
          <strong>Current</strong>
          <span>Fresh, signed status</span>
        </div>
        <div>
          <strong>Independent</strong>
          <span>Verifiable without Abraxas online</span>
        </div>
      </div>

      <HomeProtocolVisualDisclosure />
    </figure>
  );
}
