"use client";
// FILE: components/partner/launchpad/PolicyChangeControlLaunchpadSlot.tsx
// Dark-launch slot for Launchpad Policies. Renders nothing and fetches nothing when unavailable.

import { PartnerPolicyChangeControlPanel } from "@/components/partner/launchpad/PartnerPolicyChangeControlPanel";
import { shouldRenderPolicyChangeControlUi } from "@/lib/partner/launchpad/policyChangeControlUi";

export function PolicyChangeControlLaunchpadSlot({
  available,
  applicationId,
  onChanged,
}: {
  available: boolean;
  applicationId: string | null;
  onChanged?: () => void;
}) {
  if (!shouldRenderPolicyChangeControlUi(available) || !applicationId) return null;
  return (
    <PartnerPolicyChangeControlPanel
      applicationId={applicationId}
      enabled
      onChanged={onChanged}
    />
  );
}
