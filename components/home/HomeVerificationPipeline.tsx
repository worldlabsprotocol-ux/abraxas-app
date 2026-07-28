"use client";
// FILE: components/home/HomeVerificationPipeline.tsx
// End-to-end verification pipeline — trust infrastructure visualized.

import { ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";
import { HomePipelineFlow } from "./HomePipelineFlow";

const FONT = ABRAXAS_FONT_SANS;

const PIPELINE_STEPS = [
  { label: "Submit Documents", detail: "ID and selfie captured on Passport" },
  { label: "AI & Biometric Analysis", detail: "Automated face match, liveness, and fraud signals" },
  { label: "Human Review (if required)", detail: "Reviewer approves, rejects, or requests resubmission" },
  { label: "Credential Issued", detail: "Signed verifiable credential anchored to the user" },
  { label: "Reusable Across Partners", detail: "Relying parties verify proof. No document re-upload." },
] as const;

export function HomeVerificationPipeline() {
  return (
    <section aria-labelledby="home-verification-pipeline">
      <p className="abx-section-label" style={{ marginBottom: "0.5rem" }}>
        Verification pipeline
      </p>
      <h2 id="home-verification-pipeline" className="abx-home-h2" style={{ marginBottom: "0.5rem" }}>
        From documents to portable trust
      </h2>
      <p className="abx-home-lead" style={{ marginBottom: "1.15rem", maxWidth: 640 }}>
        Visitors understand processes faster than paragraphs. This is the path every verified identity follows.
      </p>
      <div style={{
        padding: "clamp(1rem, 3vw, 1.35rem)",
        borderRadius: 14,
        background: "var(--surface-raised)",
        border: "1px solid var(--border-strong)",
      }}>
        <HomePipelineFlow steps={[...PIPELINE_STEPS]} />
      </div>
    </section>
  );
}
