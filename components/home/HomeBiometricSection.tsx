"use client";
// FILE: components/home/HomeBiometricSection.tsx
// Biometric verification workflow — what actually happens.

import { Btn } from "@/components/redesign/ui";
import { ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";
import { HomePipelineFlow } from "./HomePipelineFlow";

const FONT = ABRAXAS_FONT_SANS;

const BIOMETRIC_STEPS = [
  { label: "Government ID", detail: "User submits legal name and ID image" },
  { label: "Biometric Analysis", detail: "Face match, liveness, and document signals" },
  { label: "Fraud Detection", detail: "Tamper heuristics and risk scoring" },
  { label: "Human Review", detail: "Borderline cases queue for a reviewer" },
  { label: "Reusable Credential", detail: "W3C VC issued to the user's Passport" },
] as const;

export function HomeBiometricSection() {
  return (
    <section
      aria-labelledby="home-biometric-heading"
      style={{
        padding: "clamp(1.25rem, 4vw, 1.75rem)",
        borderRadius: 16,
        background: "linear-gradient(135deg, rgba(16,185,129,0.08) 0%, rgba(167,139,250,0.06) 100%)",
        border: "1px solid rgba(16,185,129,0.2)",
      }}
    >
      <div className="abx-eyebrow-violet" style={{ marginBottom: "0.5rem" }}>
        Abraxas Verify
      </div>
      <h2 id="home-biometric-heading" style={{
        fontFamily: FONT, fontSize: "clamp(1.2rem, 3.2vw, 1.55rem)", fontWeight: 800,
        letterSpacing: "-0.03em", color: "var(--text-primary)", margin: "0 0 0.65rem",
      }}>
        Biometric verification workflow
      </h2>
      <p style={{
        fontFamily: FONT, fontSize: "0.86rem", color: "var(--text-secondary)",
        lineHeight: 1.7, margin: "0 0 1.15rem", maxWidth: 680,
      }}>
        This is the live path from document capture to a credential partners can verify.
      </p>
      <HomePipelineFlow steps={[...BIOMETRIC_STEPS]} />
      <div style={{ marginTop: "1.15rem" }}>
        <Btn href="/passport" size="md">Start verification</Btn>
      </div>
    </section>
  );
}
