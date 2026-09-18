// FILE: lib/policy/changeControl/overview.ts
// Launchpad Policies area model: active version, draft successor, comparison, per-app compatibility.

import { getPartnerPolicy, getPartnerPolicyAtVersion } from "@/lib/policy/getPolicy";
import { listLaunchpadApplicationsForPartner } from "@/lib/partner/launchpad/resolveLaunchpadApplication";
import type { LaunchpadApplicationRow } from "@/lib/partner/launchpad/types";
import { loadPartnerPolicyFamily } from "@/lib/policy/changeControl/lifecycle";
import { comparePolicyVersions, policyVersionSurface, type PolicyVersionComparison } from "@/lib/policy/changeControl/compare";
import { evaluatePolicyVersionGate } from "@/lib/policy/changeControl/issuance";
import { derivePolicyChangeControlHealth, type PolicyChangeControlHealth } from "@/lib/policy/changeControl/health";
import { listPolicyLifecycleAudit } from "@/lib/policy/changeControl/audit";

export interface ApplicationPolicyCompatibility {
  application_id: string;
  public_slug: string;
  display_name: string;
  pinned_version: number;
  compatibility: PolicyVersionComparison["compatibility"] | "unknown";
  health: PolicyChangeControlHealth;
}

export interface PolicyChangeControlOverview {
  policy_id: string;
  partner_id: string;
  active: ReturnType<typeof policyVersionSurface> | null;
  draft: ReturnType<typeof policyVersionSurface> | null;
  comparison: PolicyVersionComparison | null;
  applications: ApplicationPolicyCompatibility[];
  health: PolicyChangeControlHealth;
  next_action: string;
  blocker_code: string | null;
  audit: Awaited<ReturnType<typeof listPolicyLifecycleAudit>>;
  fixture_label: "Offline / simulated — this does not issue a production receipt.";
  google_sign_in_is_not_eligibility: string;
}

export async function buildPolicyChangeControlOverview(input: {
  policyId: string;
  partnerId: string;
  focusApplication?: LaunchpadApplicationRow | null;
}): Promise<PolicyChangeControlOverview> {
  const versions = await loadPartnerPolicyFamily({
    policyId: input.policyId,
    partnerId: input.partnerId,
  });
  const active = versions.find((row) => row.status === "active") ?? await getPartnerPolicy(input.policyId);
  const draft = versions.find((row) => row.status === "draft") ?? null;
  const comparison = active && draft ? comparePolicyVersions(active, draft) : null;

  const applications = input.focusApplication
    ? [input.focusApplication]
    : await listLaunchpadApplicationsForPartner(input.partnerId).then((rows) =>
      rows.filter((row) => row.policy_id === input.policyId),
    );

  const appViews: ApplicationPolicyCompatibility[] = [];
  for (const app of applications) {
    const pinned = await getPartnerPolicyAtVersion(app.policy_id, app.policy_version);
    const gate = evaluatePolicyVersionGate({
      policy: pinned,
      partnerId: input.partnerId,
      expectedVersion: app.policy_version,
      mode: "production_receipt",
    });
    const vsActive = pinned && active ? comparePolicyVersions(pinned, active) : comparison;
    const health = derivePolicyChangeControlHealth({
      pinnedVersion: app.policy_version,
      activeVersion: active?.version ?? null,
      draftVersion: draft?.version ?? null,
      pinnedStatus: pinned?.status ?? null,
      comparison: vsActive,
      pinnedIssuable: gate.ok,
      pinnedIssuanceCode: gate.ok ? null : gate.code,
    });
    appViews.push({
      application_id: app.id,
      public_slug: app.public_slug,
      display_name: app.display_name,
      pinned_version: app.policy_version,
      compatibility: vsActive?.compatibility ?? "unknown",
      health,
    });
  }

  const focus = input.focusApplication
    ? appViews.find((row) => row.application_id === input.focusApplication?.id)
    : appViews[0];
  const fallbackHealth = derivePolicyChangeControlHealth({
    pinnedVersion: active?.version ?? 0,
    activeVersion: active?.version ?? null,
    draftVersion: draft?.version ?? null,
    pinnedStatus: active?.status ?? null,
    comparison,
    pinnedIssuable: Boolean(active),
    pinnedIssuanceCode: active ? null : "policy_version_missing",
  });
  const health = focus?.health ?? fallbackHealth;
  const audit = await listPolicyLifecycleAudit({
    policyId: input.policyId,
    partnerId: input.partnerId,
    limit: 25,
  });

  return {
    policy_id: input.policyId,
    partner_id: input.partnerId,
    active: active ? policyVersionSurface(active) : null,
    draft: draft ? policyVersionSurface(draft) : null,
    comparison,
    applications: appViews,
    health,
    next_action: health.next_action,
    blocker_code: health.blocker_code,
    audit,
    fixture_label: "Offline / simulated — this does not issue a production receipt.",
    google_sign_in_is_not_eligibility:
      "Google sign-in creates an Abraxas account. It does not prove age, identity, residency, or eligibility.",
  };
}
