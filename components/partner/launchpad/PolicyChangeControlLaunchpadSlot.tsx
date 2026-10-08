"use client";
// FILE: components/partner/launchpad/PolicyChangeControlLaunchpadSlot.tsx
// Dark-launch slot for Launchpad Policies. Renders nothing and fetches nothing when unavailable.

import { PartnerPolicyChangeControlPanel } from "@/components/partner/launchpad/PartnerPolicyChangeControlPanel";
import { GoodTroublePolicyAdoptionPanel } from "@/components/partner/launchpad/GoodTroublePolicyAdoptionPanel";
import { shouldRenderPolicyChangeControlUi } from "@/lib/partner/launchpad/policyChangeControlUi";

export function PolicyChangeControlLaunchpadSlot({
  available,
  applicationId,
  goodTroubleSandbox = false,
  onChanged,
}: {
  available: boolean;
  applicationId: string | null;
  goodTroubleSandbox?: boolean;
  onChanged?: () => void;
}) {
  // This narrow entry point may load even if an earlier schema probe failed.
  // The authenticated GET/POST routes remain the authority and fail closed.
  if (goodTroubleSandbox && applicationId) {
    return <GoodTroublePolicyAdoptionPanel applicationId={applicationId} onChanged={onChanged} />;
  }
  if (!shouldRenderPolicyChangeControlUi(available) || !applicationId) return null;
  return (
    <PartnerPolicyChangeControlPanel
      applicationId={applicationId}
      enabled
      onChanged={onChanged}
    />
  );
}

