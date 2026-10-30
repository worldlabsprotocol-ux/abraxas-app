import type { PolicyPackId } from "@/lib/partner/launchpad/policyPacks";

export function shouldRestoreStudioPolicySelection(input: {
  packId: PolicyPackId;
  beginnerSurface: boolean;
  selectionRecorded: boolean;
  explicitIntent: boolean;
}): boolean {
  return !(
    input.beginnerSurface
    && input.packId === "wallet_control"
    && !input.selectionRecorded
    && !input.explicitIntent
  );
}
