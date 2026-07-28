"use client";
// FILE: components/home/HomeBiometricSection.tsx
// Biometric identity verification — what the protocol does today.

import { Btn } from "@/components/redesign/ui";
import { ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";

const FONT = ABRAXAS_FONT_SANS;

const SIGNALS = [
  "Face match",
  "Government ID",
  "Fraud detection",
  "Human review",
  "Portable credential",
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
        Biometric identity verification
      </h2>
      <p style={{
        fontFamily: FONT, fontSize: "0.86rem", color: "var(--text-secondary)",
        lineHeight: 1.7, margin: "0 0 1rem", maxWidth: 680,
      }}>
        Verify your government ID and selfie once. Abraxas analyzes identity signals, performs fraud
        screening, and creates a reusable verification credential trusted across participating applications.
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.45rem", marginBottom: "1rem" }}>
        {SIGNALS.map(s => (
          <span
            key={s}
            style={{
              fontFamily: FONT, fontSize: "0.72rem", fontWeight: 600,
              padding: "0.35rem 0.65rem", borderRadius: 999,
              background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.25)",
              color: "#A7F3D0",
            }}
          >
            ✓ {s}
          </span>
        ))}
      </div>
      <Btn href="/passport" size="md">Create Passport</Btn>
    </section>
  );
}
