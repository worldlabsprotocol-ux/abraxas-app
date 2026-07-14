"use client";
// FILE: app/portal/settle/page.tsx
// USDC settlement for deal-ready owner applications.

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { RedesignPage } from "@/components/redesign/RedesignPage";
import { OwnerSettlementPanel } from "@/components/portal/OwnerSettlementPanel";
import { WalletContextProvider } from "@/components/WalletContextProvider";
import { SuiAuthProvider } from "@/components/sui/SuiAuthProvider";

const FONT = "'Inter',system-ui,sans-serif";

function SettleInner() {
  const params = useSearchParams();
  const applicationId = params.get("application_id") ?? "";
  const email = params.get("email") ?? "";

  if (!applicationId || !email) {
    return (
      <p style={{ fontFamily: FONT, fontSize: "0.82rem", color: "var(--text-secondary)" }}>
        Missing application reference. Return to{" "}
        <Link href="/portal/journey" style={{ color: "#10B981" }}>your journey</Link>.
      </p>
    );
  }

  return (
    <div style={{ maxWidth: 520, margin: "0 auto" }}>
      <OwnerSettlementPanel applicationId={applicationId} email={email} />
    </div>
  );
}

export default function PortalSettlePage() {
  return (
    <WalletContextProvider>
      <SuiAuthProvider>
        <RedesignPage maxWidth={720}>
          <Suspense fallback={null}>
            <SettleInner />
          </Suspense>
        </RedesignPage>
      </SuiAuthProvider>
    </WalletContextProvider>
  );
}
