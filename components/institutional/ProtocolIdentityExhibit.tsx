"use client";

import { ProtocolBrandFigure } from "@/components/brand/ProtocolBrandFigure";

export function ProtocolIdentityExhibit() {
  return (
    <section className="abx-protocol-identity-exhibit" aria-labelledby="protocol-identity-heading">
      <div className="abx-protocol-identity-exhibit__header">
        <p className="abx-v2-eyebrow">Protocol exhibit</p>
        <h2 id="protocol-identity-heading" className="abx-v2-section-title">
          Independent verification architecture
        </h2>
        <p className="abx-v2-section-lead">
          Abraxas binds policy-specific eligibility to signed decision receipts. Partners verify outcomes without
          receiving identity files, and holders control what is shared per request.
        </p>
      </div>
      <ProtocolBrandFigure
        asset="protocolBanner"
        priority
        caption="Founder-provided protocol banner — verify what matters; reveal nothing else."
      />
      <ProtocolBrandFigure
        asset="architectureExhibit"
        caption="Conceptual architecture — sector-specific gates and a single verification boundary; not a live deployment map."
      />
    </section>
  );
}
