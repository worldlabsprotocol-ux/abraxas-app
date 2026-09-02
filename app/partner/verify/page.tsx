// FILE: app/partner/verify/page.tsx
// Generic relying-party verification entry — configured per partner via query params.

import { Suspense } from "react";
import { PartnerVerifyClient } from "@/components/partner/PartnerVerifyClient";
import { RedesignPageLoading } from "@/components/redesign/RedesignPageLoading";
import {
  isPartnerVerifyPreviewControlsEnabled,
  resolvePartnerVerifyPreviewPhase,
  resolvePartnerVerifyPreviewSignInConfigured,
} from "@/lib/partner/partnerVerifyPreview";

export const dynamic = "force-dynamic";

type PartnerVerifyPageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

export default function PartnerVerifyPage({ searchParams = {} }: PartnerVerifyPageProps) {
  const previewControlsEnabled = isPartnerVerifyPreviewControlsEnabled();
  const previewPhase = resolvePartnerVerifyPreviewPhase(searchParams, previewControlsEnabled);
  const previewSignInConfigured = resolvePartnerVerifyPreviewSignInConfigured(
    searchParams,
    previewControlsEnabled,
  );

  return (
    <div data-theme="dark" style={{ minHeight: "100vh", background: "#04050a" }}>
      <Suspense fallback={<RedesignPageLoading label="Loading verification…" compact />}>
        <PartnerVerifyClient
          previewPhase={previewPhase}
          previewSignInConfigured={previewSignInConfigured}
        />
      </Suspense>
    </div>
  );
}
