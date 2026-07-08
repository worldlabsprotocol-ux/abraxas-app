// FILE: components/verify/VerifyStaticSample.tsx
// Server-rendered Cielo sample — visible to crawlers without JavaScript.

import { resolveVerifierQuery } from "@/lib/verifyRegistry";
import { CIELO_VERIFIER_PREVIEW } from "@/lib/verifierPreviewSample";
import { CIELO_HERO_IMAGE } from "@/lib/data/cieloMedia";
import { VerifierResultCard } from "./VerifierResultCard";

export async function VerifyStaticSample() {
  let result = CIELO_VERIFIER_PREVIEW;
  try {
    const live = await resolveVerifierQuery("ABX-RE-HOSP-001");
    if (live.state !== "NULL_STATE") {
      result = {
        ...live,
        notice: CIELO_VERIFIER_PREVIEW.notice,
      };
    }
  } catch {
    /* static fallback */
  }

  return (
    <section
      aria-labelledby="verify-static-sample-heading"
      style={{ maxWidth: 1180, margin: "0 auto", padding: "0 clamp(1rem, 3vw, 2rem) 1.5rem" }}
    >
      <h2
        id="verify-static-sample-heading"
        style={{
          fontFamily: "'Inter',system-ui,sans-serif",
          fontSize: "0.82rem",
          fontWeight: 700,
          color: "var(--text-secondary)",
          margin: "0 0 0.75rem",
        }}
      >
        Sample result — Cielo Sunrise (ABX-RE-HOSP-001)
      </h2>
      <div style={{ maxWidth: 520 }}>
        <VerifierResultCard
          result={result}
          previewLabel="Crawler-visible sample · no sign-in required"
          heroImage={CIELO_HERO_IMAGE.src}
        />
      </div>
    </section>
  );
}
