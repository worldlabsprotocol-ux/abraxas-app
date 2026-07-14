"use client";
// FILE: app/portal/journey/page.tsx
// End-to-end owner journey: wallet → verify → deal → USDC.

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader } from "@/components/redesign/RedesignContent";
import { OwnerJourneyPanel } from "@/components/portal/OwnerJourneyPanel";
import { WalletContextProvider } from "@/components/WalletContextProvider";
import { SuiAuthProvider } from "@/components/sui/SuiAuthProvider";

const FONT = "'Inter',system-ui,sans-serif";

function JourneyInner() {
  const params = useSearchParams();
  const applicationId = params.get("application_id") ?? params.get("id") ?? "";
  const email = params.get("email") ?? "";

  if (!applicationId || !email) {
    return (
      <div style={{ maxWidth: 560, margin: "0 auto" }}>
        <p style={{ fontFamily: FONT, fontSize: "0.82rem", color: "var(--text-secondary)" }}>
          Open this page from your application confirmation, or{" "}
          <Link href="/portal/apply" style={{ color: "#10B981", fontWeight: 700 }}>start intake</Link>.
        </p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 580, margin: "0 auto" }}>
      <OwnerJourneyPanel applicationId={applicationId} email={email} />
    </div>
  );
}

export default function PortalJourneyPage() {
  return (
    <WalletContextProvider>
      <SuiAuthProvider>
        <RedesignPage maxWidth={720}>
          <PageHeader
            eyebrow="Owner journey"
            title="Wallet → verified → settle in USDC"
            subtitle="The full Abraxas loop for land developers — same infrastructure as Cielo Sunrise, applied to your asset."
          />
          <Suspense fallback={null}>
            <JourneyInner />
          </Suspense>
          <div style={{ maxWidth: 580, margin: "1.25rem auto 2rem" }}>
            <Link href="/portal" style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-muted)", textDecoration: "none" }}>
              ← Owner portal
            </Link>
          </div>
        </RedesignPage>
      </SuiAuthProvider>
    </WalletContextProvider>
  );
}
