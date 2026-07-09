"use client";
// FILE: components/home/HomeProofSection.tsx

import Link from "next/link";
import { IssuerHolderVerifierSection } from "@/components/vision/IssuerHolderVerifierSection";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const ACCENT = "#10B981";

const SECTION: React.CSSProperties = {
  padding: "clamp(2rem, 5vw, 3rem) 0",
  borderTop: "1px solid var(--border-strong)",
};

export function HomeProofSection() {
  return (
    <section style={SECTION} aria-labelledby="proof-heading">
      <div style={{
        fontFamily: MONO, fontSize: "0.58rem", fontWeight: 700,
        letterSpacing: "0.12em", textTransform: "uppercase",
        color: ACCENT, marginBottom: "0.5rem",
      }}>
        Proof, not profiles
      </div>
      <h2 id="proof-heading" style={{
        fontFamily: FONT, fontSize: "var(--fs-h2)", fontWeight: 800,
        letterSpacing: "-0.02em", lineHeight: 1.15,
        color: "var(--text-primary)", margin: "0 0 0.75rem", maxWidth: 560,
      }}>
        Most platforms repeat the same checks. Abraxas changes the flow.
      </h2>
      <p style={{
        fontFamily: FONT, fontSize: "0.82rem", color: "var(--text-secondary)",
        lineHeight: 1.7, maxWidth: 560, margin: "0 0 1.25rem",
      }}>
        An approved issuer verifies a claim. The holder controls consent. A partner checks the proof against its policy.
        No repeated uploads. No public personal data. No generic &ldquo;KYC verified&rdquo; badge pretending to mean everything.
      </p>
      <IssuerHolderVerifierSection compact />
      <Link href="/trust-framework" style={{
        display: "inline-block", marginTop: "1.25rem",
        fontFamily: FONT, fontSize: "0.78rem", fontWeight: 700, color: ACCENT, textDecoration: "none",
      }}>
        Explore the trust framework →
      </Link>
    </section>
  );
}
