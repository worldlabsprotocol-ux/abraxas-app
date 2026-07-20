// FILE: components/home/PreRaiseHero.tsx
// Hero — one headline, one subline, two CTAs. Server-rendered.

import { Btn } from "@/components/redesign/ui";

export function PreRaiseHero() {
  return (
    <section id="top" aria-labelledby="home-hero-heading" className="pr-section">
      <span className="pr-label pr-label-live">Beta</span>
      <h1 id="home-hero-heading" className="pr-display">
        Stop proving your assets over and over.
      </h1>
      <p className="pr-lead">
        One verification. Unlimited applications.
      </p>
      <div className="pr-cta-row">
        <Btn href="#verifier" size="lg">Verify a proof →</Btn>
        <Btn href="/docs" variant="secondary" size="lg">Build with Abraxas →</Btn>
      </div>
    </section>
  );
}
