// FILE: app/cielo/verified-rate/confirmation/page.tsx
// Public-safe confirmation for pilot verified-rate requests.

import Link from "next/link";
import { RedesignShell } from "@/components/redesign/RedesignShell";

const FONT = "'Inter',system-ui,sans-serif";
const MONO = "'JetBrains Mono',monospace";
const ACCENT = "#10B981";

interface PageProps {
  searchParams?: { ref?: string };
}

export default function VerifiedRateConfirmationPage({ searchParams }: PageProps) {
  const ref = searchParams?.ref?.trim();

  return (
    <RedesignShell>
      <div style={{ maxWidth: 520, margin: "0 auto", padding: "clamp(3rem, 8vw, 5rem) clamp(1rem, 3vw, 2rem)", textAlign: "center" }}>
        <div style={{ fontFamily: FONT, fontSize: "1.35rem", fontWeight: 800, color: ACCENT, marginBottom: "0.5rem" }}>
          Request received
        </div>
        <p style={{ fontFamily: FONT, fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.7, margin: "0 0 1rem" }}>
          Your pilot verified-rate request is logged. This is not a confirmed reservation — a Cielo operator will review
          your eligibility decision and follow up by email.
        </p>
        {ref && (
          <div style={{
            fontFamily: MONO, fontSize: "0.72rem", color: "var(--text-primary)",
            padding: "0.75rem", borderRadius: 12, background: "var(--surface-inset)",
            border: "1px solid var(--border)", marginBottom: "1.25rem",
          }}>
            Reference: {ref}
          </div>
        )}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", justifyContent: "center" }}>
          <Link href="/verify/ABX-RE-HOSP-001" style={{ fontFamily: FONT, fontSize: "0.78rem", fontWeight: 700, color: ACCENT, textDecoration: "none" }}>
            View public record →
          </Link>
          <Link href="/flagship" style={{ fontFamily: FONT, fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)", textDecoration: "none" }}>
            Back to Cielo
          </Link>
        </div>
      </div>
    </RedesignShell>
  );
}
