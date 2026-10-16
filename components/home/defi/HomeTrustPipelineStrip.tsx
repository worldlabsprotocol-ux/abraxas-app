// FILE: components/home/defi/HomeTrustPipelineStrip.tsx

import { DEFI_TRUST_PIPELINE } from "@/lib/home/defiVisualHomeCopy";

export function HomeTrustPipelineStrip() {
  return (
    <section className="abx-defi-pipeline" aria-label="Trust verification flow">
      <div className="abx-defi-pipeline__track">
        {DEFI_TRUST_PIPELINE.map((step, index) => (
          <span key={step.id} style={{ display: "contents" }}>
            <div className="abx-defi-pipeline__step">
              <p className="abx-defi-pipeline__step-label">{step.label}</p>
              <p className="abx-defi-pipeline__step-short">{step.short}</p>
            </div>
            {index < DEFI_TRUST_PIPELINE.length - 1 ? (
              <span className="abx-defi-pipeline__arrow" aria-hidden="true">
                →
              </span>
            ) : null}
          </span>
        ))}
      </div>
    </section>
  );
}
