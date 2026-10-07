// FILE: app/partner/verify/page.tsx
// Generic relying-party verification entry — configured per partner via query params.

import { Suspense } from "react";
import { PartnerVerifyClient } from "@/components/partner/PartnerVerifyClient";
import { RedesignPageLoading } from "@/components/redesign/RedesignPageLoading";
import {
  isPartnerVerifyPreviewControlsEnabled,
  resolvePartnerVerifyPreviewEnvironment,
  resolvePartnerVerifyPreviewPartnerName,
  resolvePartnerVerifyPreviewPhase,
  resolvePartnerVerifyPreviewSignInConfigured,
} from "@/lib/partner/partnerVerifyPreview";

export const dynamic = "force-dynamic";

type PartnerVerifyPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function PartnerVerifyPage({ searchParams }: PartnerVerifyPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const previewControlsEnabled = isPartnerVerifyPreviewControlsEnabled();
  const previewPhase = resolvePartnerVerifyPreviewPhase(resolvedSearchParams, previewControlsEnabled);
  const previewSignInConfigured = resolvePartnerVerifyPreviewSignInConfigured(
    resolvedSearchParams,
    previewControlsEnabled,
  );
  const previewEnvironment = resolvePartnerVerifyPreviewEnvironment(resolvedSearchParams, previewControlsEnabled);
  const previewPartnerName = resolvePartnerVerifyPreviewPartnerName(resolvedSearchParams, previewControlsEnabled);

  return (
    <Suspense fallback={<RedesignPageLoading label="Loading verification…" compact />}>
      <PartnerVerifyClient
        previewPhase={previewPhase}
        previewSignInConfigured={previewSignInConfigured}
        previewEnvironment={previewEnvironment}
        previewPartnerName={previewPartnerName}
      />
    </Suspense>
  );
}
