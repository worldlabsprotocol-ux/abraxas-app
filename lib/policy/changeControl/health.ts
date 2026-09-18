// FILE: lib/policy/changeControl/health.ts
// Server-derived Policy Change Control readiness. No client-supplied status is trusted.

import type { PolicyVersionComparison } from "@/lib/policy/changeControl/compare";

export type PolicyChangeControlHealthStatus = "pass" | "action_required" | "blocked";

export interface PolicyChangeControlHealth {
  status: PolicyChangeControlHealthStatus;
  next_action: string;
  blocker_code: string | null;
  pinned_version: number;
  active_version: number | null;
  draft_version: number | null;
  compatibility: PolicyVersionComparison["compatibility"] | "unknown";
}

export function derivePolicyChangeControlHealth(input: {
  pinnedVersion: number;
  activeVersion: number | null;
  draftVersion: number | null;
  pinnedStatus: string | null;
  comparison?: PolicyVersionComparison | null;
  pinnedIssuable: boolean;
  pinnedIssuanceCode?: string | null;
}): PolicyChangeControlHealth {
  if (!input.pinnedIssuable) {
    return {
      status: "blocked",
      next_action: "Fix the pinned policy version before issuing receipts.",
      blocker_code: input.pinnedIssuanceCode ?? "policy_version_unknown",
      pinned_version: input.pinnedVersion,
      active_version: input.activeVersion,
      draft_version: input.draftVersion,
      compatibility: input.comparison?.compatibility ?? "unknown",
    };
  }

  if (input.pinnedStatus === "draft") {
    return {
      status: "blocked",
      next_action: "Publish the draft after server-side validation. Drafts cannot issue production receipts.",
      blocker_code: "policy_version_draft",
      pinned_version: input.pinnedVersion,
      active_version: input.activeVersion,
      draft_version: input.draftVersion,
      compatibility: input.comparison?.compatibility ?? "unknown",
    };
  }

  if (input.activeVersion != null && input.pinnedVersion !== input.activeVersion) {
    const breaking = input.comparison?.compatibility === "breaking";
    return {
      status: breaking ? "blocked" : "action_required",
      next_action: breaking
        ? "Update the integration for added claims or higher assurance, then explicitly adopt the published version."
        : `Explicitly adopt published policy version ${input.activeVersion}.`,
      blocker_code: breaking
        ? (input.comparison?.blocker_code ?? "policy_version_incompatible_claims")
        : "policy_version_not_adopted",
      pinned_version: input.pinnedVersion,
      active_version: input.activeVersion,
      draft_version: input.draftVersion,
      compatibility: input.comparison?.compatibility ?? "unknown",
    };
  }

  if (input.draftVersion != null) {
    return {
      status: "action_required",
      next_action: "Review the draft successor, run the offline fixture test, then publish after validation.",
      blocker_code: null,
      pinned_version: input.pinnedVersion,
      active_version: input.activeVersion,
      draft_version: input.draftVersion,
      compatibility: input.comparison?.compatibility ?? "identical",
    };
  }

  return {
    status: "pass",
    next_action: "No policy version action required. New receipts stay bound to the pinned version.",
    blocker_code: null,
    pinned_version: input.pinnedVersion,
    active_version: input.activeVersion,
    draft_version: input.draftVersion,
    compatibility: input.comparison?.compatibility ?? "identical",
  };
}
