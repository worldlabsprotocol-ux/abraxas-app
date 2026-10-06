"use client";
// FILE: components/partner/HolderRequestBriefCard.tsx
// Holder-first request card — delegates to Phantom-quality primitives.

import type { HolderRequestBrief } from "@/lib/partner/holderExperience";
import { buildHolderVerificationPresentation } from "@/lib/partner/holderExperience/presentation";
import { HolderVerificationRequest } from "@/components/partner/holder";

export function HolderRequestBriefCard({
  brief,
  partnerName,
  policyId,
  purpose,
}: {
  brief: HolderRequestBrief;
  partnerName?: string;
  policyId?: string;
  purpose?: string | null;
}) {
  const presentation = buildHolderVerificationPresentation({
    partnerName: partnerName ?? brief.requestor,
    policyId: policyId ?? "",
    brief,
    purpose,
  });

  return <HolderVerificationRequest presentation={presentation} />;
}
