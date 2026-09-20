// FILE: lib/partner/launchpad/policyVersionPlanner/view.ts
// Safe partner-facing planner view. Server-pinned policy only.

import { POLICY_PACK_CATALOG_VERSION } from "@/lib/partner/launchpad/policyPacks";
import type { LaunchpadApplicationRow } from "@/lib/partner/launchpad/types";
import { studioPayloadLeaks } from "@/lib/partner/integrationStudio/safety";
import {
  POLICY_VERSION_GOOGLE,
  POLICY_VERSION_NOTICE,
  POLICY_VERSION_PLANNER_VERSION,
  policyVersionNextHrefs,
  studioPolicyVersionHandoffHref,
  type PolicyVersionAvailability,
} from "./contract";
import {
  hasActiveReviewedContinuity,
  REUSABLE_CONTINUITY_REVIEWED_LABEL,
  type PolicyCompatibilityEdge,
} from "@/lib/policy/compatibilityEdge";
import {
  POLICY_PACK_PINNED_STATUS_OVERRIDES,
  POLICY_PACK_VERSION_SUCCESSORS,
  applySuccessor,
  resolvePackForPlanner,
  surfaceFromPack,
  type PolicyVersionSurface,
} from "./surface";
import {
  availabilityForPin,
  availabilityLabel,
  comparePolicyVersionSurfaces,
  type PolicyVersionComparisonView,
} from "./compare";

export interface PolicyVersionPlannerView {
  version: typeof POLICY_VERSION_PLANNER_VERSION;
  application_id: string;
  pack_id: string | null;
  policy_template_id: string;
  policy_id: string;
  pinned_version: number;
  catalog_version: number;
  availability: PolicyVersionAvailability;
  availability_label: string;
  current: PolicyVersionSurface | null;
  comparison: PolicyVersionComparisonView | null;
  google_is_account_only: string;
  review_notice: string;
  next_actions: Array<{ id: string; label: string; href: string }>;
  studio_handoff: string | null;
  reusable_continuity_reviewed: boolean;
  reusable_continuity_label: typeof REUSABLE_CONTINUITY_REVIEWED_LABEL | null;
  mutates_policy_pin: false;
  mutates_holder_flow: false;
  issues_production_key: false;
  activates_production: false;
}

export function buildPolicyVersionPlannerView(
  application: LaunchpadApplicationRow,
  catalog = POLICY_PACK_VERSION_SUCCESSORS,
  registry?: readonly PolicyCompatibilityEdge[],
): PolicyVersionPlannerView {
  const pack = resolvePackForPlanner(application.policy_template_id, application.policy_id);
  const pinnedVersion = application.policy_version;
  const pinnedStatus = pack
    ? (POLICY_PACK_PINNED_STATUS_OVERRIDES[pack.id] ?? "current")
    : null;
  const current = pack
    ? surfaceFromPack({ pack, version: pinnedVersion, status: pinnedStatus ?? "current" })
    : null;
  const successorSpecs = pack
    ? catalog.filter((item) => item.pack_id === pack.id && item.version > pinnedVersion)
    : [];
  successorSpecs.sort((a, b) => a.version - b.version);
  const newer = current && successorSpecs[0] ? applySuccessor(current, successorSpecs[0]) : null;
  const availability = availabilityForPin({
    packFound: Boolean(pack),
    pinnedVersion,
    pinnedStatus,
    newer,
  });
  const comparison = current && newer ? comparePolicyVersionSurfaces(current, newer) : null;
  const hrefs = policyVersionNextHrefs(application.id);
  const next_actions: PolicyVersionPlannerView["next_actions"] = [
    { id: "continue_current", label: "Continue on the current pinned version", href: hrefs.continue_current },
  ];
  if (pack) {
    next_actions.push({
      id: "studio",
      label: "Open Integration Studio with this policy preselected",
      href: studioPolicyVersionHandoffHref(pack.id, newer?.version ?? POLICY_PACK_CATALOG_VERSION),
    });
    next_actions.push({
      id: "create_sandbox",
      label: "Create a separate sandbox test app",
      href: hrefs.create_sandbox,
    });
  }
  next_actions.push({ id: "test_console", label: "Use the sandbox test console", href: hrefs.test_console });
  next_actions.push({
    id: "production_review",
    label: "Request a reviewed Production change",
    href: hrefs.production_review,
  });

  const reviewed = Boolean(
    pack && newer && hasActiveReviewedContinuity({
      sourcePackId: pack.id,
      sourceVersion: pinnedVersion,
      targetPackId: newer.pack_id ?? pack.id,
      targetVersion: newer.version,
      registry,
    }),
  );

  return {
    version: POLICY_VERSION_PLANNER_VERSION,
    application_id: application.id,
    pack_id: pack?.id ?? null,
    policy_template_id: application.policy_template_id,
    policy_id: application.policy_id,
    pinned_version: pinnedVersion,
    catalog_version: POLICY_PACK_CATALOG_VERSION,
    availability,
    availability_label: availabilityLabel(availability),
    current,
    comparison,
    google_is_account_only: POLICY_VERSION_GOOGLE,
    review_notice: POLICY_VERSION_NOTICE,
    next_actions,
    studio_handoff: pack
      ? studioPolicyVersionHandoffHref(pack.id, newer?.version ?? POLICY_PACK_CATALOG_VERSION)
      : null,
    reusable_continuity_reviewed: reviewed,
    reusable_continuity_label: reviewed ? REUSABLE_CONTINUITY_REVIEWED_LABEL : null,
    mutates_policy_pin: false,
    mutates_holder_flow: false,
    issues_production_key: false,
    activates_production: false,
  };
}

export function policyVersionPlannerLeaks(view: PolicyVersionPlannerView): string[] {
  return studioPayloadLeaks(view);
}
