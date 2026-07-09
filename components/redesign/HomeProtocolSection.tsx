"use client";
// FILE: components/redesign/HomeProtocolSection.tsx
// Technical architecture band — visually separate from user benefit section.

import { Btn } from "./ui";
import { IssuerHolderVerifierSection } from "@/components/vision/IssuerHolderVerifierSection";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const ACCENT = "#10B981";

export function HomeProtocolSection() {
  return (
    <section
      id="the-protocol"
      aria-labelledby="protocol-heading"
      style={{
        padding: "clamp(2rem, 5vw, 3rem) 0",
        marginTop: "0.5rem",
      }}
    >
      <div style={{
        fontFamily: MONO, fontSize: "0.58rem", fontWeight: 700,
        letterSpacing: "0.12em", textTransform: "uppercase",
        color: ACCENT, marginBottom: "0.5rem",
      }}>
        The protocol
      </div>
      <h2 id="protocol-heading" style={{
        fontFamily: FONT, fontSize: "var(--fs-h2)", fontWeight: 800,
        letterSpacing: "-0.02em", lineHeight: 1.15,
        color: "var(--text-primary)", margin: "0 0 0.65rem", maxWidth: 620,
      }}>
        Issuer → Holder → Verifier
      </h2>
      <p style={{
        fontFamily: FONT, fontSize: "0.82rem", color: "var(--text-secondary)",
        lineHeight: 1.65, maxWidth: 620, margin: "0 0 1.5rem",
      }}>
        A policy-controlled credential network for permissioned finance.
        Share the proof, not the documents.
      </p>
      <IssuerHolderVerifierSection compact />
      <div style={{ marginTop: "1.25rem" }}>
        <Btn href="/integrations" variant="secondary" size="md">Explore architecture →</Btn>
      </div>
    </section>
  );
}
