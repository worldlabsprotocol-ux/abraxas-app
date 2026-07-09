// FILE: app/cielo/verified-rate/confirmation/page.tsx
// User-facing verified-rate request status — not a reservation confirmation.

import { RedesignShell } from "@/components/redesign/RedesignShell";
import { VerifiedRateConfirmationClient } from "@/components/cielo/VerifiedRateConfirmationClient";

interface PageProps {
  searchParams?: { ref?: string };
}

export default function VerifiedRateConfirmationPage({ searchParams }: PageProps) {
  const ref = searchParams?.ref?.trim();

  return (
    <RedesignShell>
      {ref ? (
        <VerifiedRateConfirmationClient refCode={ref} />
      ) : (
        <div style={{ maxWidth: 520, margin: "0 auto", padding: "4rem 1rem", textAlign: "center", fontFamily: "'Inter',sans-serif" }}>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>
            Missing request reference. Complete a verified-rate request to receive a reference code.
          </p>
        </div>
      )}
    </RedesignShell>
  );
}
