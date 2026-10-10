// FILE: app/cielo/verified-rate/confirmation/page.tsx
// User-facing verified-rate request status. not a reservation confirmation.

import { VerifiedRateConfirmationClient } from "@/components/cielo/VerifiedRateConfirmationClient";

interface PageProps {
  searchParams?: { ref?: string };
}

export default function VerifiedRateConfirmationPage({ searchParams }: PageProps) {
  const ref = searchParams?.ref?.trim();

  if (!ref) {
    return (
      <div style={{ maxWidth: 520, margin: "0 auto", padding: "3rem 1rem", textAlign: "center", fontFamily: "'Inter',sans-serif" }}>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>
          Missing request reference. Complete a verified guest request to receive a reference code.
        </p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "clamp(1.5rem, 5vw, 3rem) clamp(1rem, 3vw, 2rem)" }}>
      <VerifiedRateConfirmationClient refCode={ref} />
    </div>
  );
}
