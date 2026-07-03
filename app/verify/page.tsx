import { Suspense } from "react";
import { RedesignShell } from "@/components/redesign/RedesignShell";
import { PublicVerifierPanel } from "@/components/verify/PublicVerifierPanel";

export const metadata = {
  title: "Public Registry Verifier · Abraxas",
  description: "Instantly authenticate any Abraxas Passport DID, credential hash, or asset identifier.",
};

export default function VerifyPage() {
  return (
    <RedesignShell>
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "clamp(2rem, 6vw, 4rem) clamp(1rem, 3vw, 2rem)" }}>
        <div style={{
          fontFamily: "'JetBrains Mono',monospace",
          fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.14em",
          textTransform: "uppercase", color: "#10B981", marginBottom: "0.75rem",
        }}>
          Public registry verifier
        </div>
        <h1 style={{
          fontFamily: "'Inter',system-ui,sans-serif",
          fontSize: "clamp(1.6rem, 4vw, 2.2rem)", fontWeight: 800,
          letterSpacing: "-0.03em", color: "var(--text-primary)",
          margin: "0 0 0.75rem", lineHeight: 1.1,
        }}>
          Run cryptographic check
        </h1>
        <p style={{
          fontFamily: "'Inter',system-ui,sans-serif",
          fontSize: "0.9rem", color: "var(--text-secondary)",
          lineHeight: 1.7, maxWidth: 640, margin: "0 0 1.25rem",
        }}>
          Validate the integrity, provenance, and active compliance state of any Abraxas Passport,
          credential JWT, or verified asset ID. The example panel shows what a valid Cielo check looks like — click &quot;Try Cielo example&quot; for a live API response.
        </p>
        <Suspense fallback={null}>
          <PublicVerifierPanel />
        </Suspense>
      </div>
    </RedesignShell>
  );
}
