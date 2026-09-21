// FILE: lib/partner/launchpad/policyVersionPlanner/compare.ts
// Compatibility rules for catalog versions. Client versions are never authority.

import type { PolicyVersionAvailability, PolicyVersionCompatibilityResult } from "./contract";
import { POLICY_VERSION_PATHS } from "./contract";
import type { PolicyVersionSurface, PolicyVersionStatus } from "./surface";

export interface PolicyVersionComparisonView {
  from: PolicyVersionSurface;
  to: PolicyVersionSurface;
  result_category: { from: string; to: string; changed: boolean };
  method_category: { from: string; to: string; changed: boolean };
  partner_receives: { from: string; to: string; changed: boolean };
  withheld: { from: string[]; to: string[]; changed: boolean };
  allowed_output_fields: { from: string[]; to: string[]; changed: boolean };
  environment: { from: string; to: string; changed: boolean };
  issuer_method_plan: { from: string; to: string; changed: boolean };
  paths: Record<string, { from: boolean; to: boolean; changed: boolean }>;
  compatibility: PolicyVersionCompatibilityResult;
  compatibility_label: string;
}

export function withheldChanged(from: readonly string[], to: readonly string[]): boolean {
  const left = from.slice().sort().join("|");
  const right = to.slice().sort().join("|");
  return left !== right;
}

export function comparePolicyVersionSurfaces(
  from: PolicyVersionSurface,
  to: PolicyVersionSurface,
): PolicyVersionComparisonView {
  const resultChanged = from.result_category !== to.result_category;
  const methodChanged = from.method_category !== to.method_category;
  const receivesChanged = from.partner_receives !== to.partner_receives;
  const withheldDiff = withheldChanged(from.withheld, to.withheld);
  const outputDiff = withheldChanged(from.allowed_output_fields, to.allowed_output_fields);
  const environmentChanged = from.sandbox_only !== to.sandbox_only || from.production_review !== to.production_review;
  const issuerPlanChanged = from.issuer_method_plan !== to.issuer_method_plan;
  const paths: PolicyVersionComparisonView["paths"] = {};
  let pathChanged = false;
  POLICY_VERSION_PATHS.forEach((id) => {
    const changed = from.paths[id] !== to.paths[id];
    if (changed) pathChanged = true;
    paths[id] = { from: from.paths[id], to: to.paths[id], changed };
  });

  let compatibility: PolicyVersionCompatibilityResult = "unchanged";
  if (resultChanged || receivesChanged || withheldDiff || outputDiff || environmentChanged || issuerPlanChanged) {
    compatibility = "policy_review";
  } else if (methodChanged || pathChanged) {
    compatibility = "sandbox_retest";
  }

  const labels: Record<PolicyVersionCompatibilityResult, string> = {
    unchanged: "Unchanged — current integrations can keep the pinned version",
    sandbox_retest: "Requires sandbox retest before any Production review",
    policy_review: "Requires policy review — do not treat this as a silent upgrade",
  };

  return {
    from,
    to,
    result_category: { from: from.result_category, to: to.result_category, changed: resultChanged },
    method_category: { from: from.method_category, to: to.method_category, changed: methodChanged },
    partner_receives: { from: from.partner_receives, to: to.partner_receives, changed: receivesChanged },
    withheld: { from: from.withheld.slice(), to: to.withheld.slice(), changed: withheldDiff },
    allowed_output_fields: {
      from: from.allowed_output_fields.slice(),
      to: to.allowed_output_fields.slice(),
      changed: outputDiff,
    },
    environment: { from: from.environment_label, to: to.environment_label, changed: environmentChanged },
    issuer_method_plan: { from: from.issuer_method_plan, to: to.issuer_method_plan, changed: issuerPlanChanged },
    paths,
    compatibility,
    compatibility_label: labels[compatibility],
  };
}

export function availabilityForPin(input: {
  packFound: boolean;
  pinnedVersion: number;
  pinnedStatus: PolicyVersionStatus | null;
  newer: PolicyVersionSurface | null;
}): PolicyVersionAvailability {
  if (!input.packFound || input.pinnedStatus == null) return "catalog_unknown";
  if (input.pinnedStatus === "deprecated" || input.pinnedStatus === "unavailable") return "deprecated";
  if (input.newer) return "newer_planning";
  return "no_newer";
}

export function availabilityLabel(availability: PolicyVersionAvailability): string {
  if (availability === "no_newer") return "No newer compatible catalog version";
  if (availability === "newer_planning") return "A newer catalog version is available for planning";
  if (availability === "deprecated") return "The pinned version is deprecated or unavailable";
  return "Catalog state is unknown or missing";
}
