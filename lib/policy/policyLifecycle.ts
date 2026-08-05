// FILE: lib/policy/policyLifecycle.ts
// P1-1 policy lifecycle states and immutability boundary (mirrors 055 migration trigger).

import type { PartnerPolicyRules } from "@/lib/policy/types";

export type PolicyLifecycleStatus = "draft" | "active" | "deprecated";

export const POLICY_LIFECYCLE_STATUSES: PolicyLifecycleStatus[] = [
  "draft",
  "active",
  "deprecated",
];

/** Fields frozen once a policy version leaves draft. */
export const IMMUTABLE_PUBLISHED_POLICY_FIELDS = [
  "id",
  "version",
  "partner_id",
  "name",
  "rules_json",
  "effective_at",
] as const;

export type ImmutablePublishedPolicyField = (typeof IMMUTABLE_PUBLISHED_POLICY_FIELDS)[number];

export class PolicyImmutabilityError extends Error {
  readonly code = "policy_immutability_violation";

  constructor(message: string) {
    super(message);
    this.name = "PolicyImmutabilityError";
  }
}

export function isPolicyDraft(status: string): boolean {
  return status === "draft";
}

export function isPublishedPolicyStatus(status: string): boolean {
  return status === "active" || status === "deprecated";
}

export function assertPublishedPolicyFieldsUnchanged(
  current: {
    status: string;
    id: string;
    version: number;
    partner_id: string;
    name: string;
    rules_json: PartnerPolicyRules;
    effective_at?: string;
  },
  next: Partial<typeof current>,
): void {
  if (!isPublishedPolicyStatus(current.status)) return;

  for (const field of IMMUTABLE_PUBLISHED_POLICY_FIELDS) {
    if (!(field in next)) continue;
    const before = current[field as keyof typeof current];
    const after = next[field as keyof typeof next];
    if (JSON.stringify(before) !== JSON.stringify(after)) {
      throw new PolicyImmutabilityError(
        `Cannot mutate ${field} on ${current.status} policy ${current.id} v${current.version}`,
      );
    }
  }
}

export function assertPolicyStatusTransition(
  from: string,
  to: string,
): void {
  if (from === to) return;

  if (from === "draft" && (to === "active" || to === "deprecated")) return;
  if (from === "active" && to === "deprecated") return;

  throw new PolicyImmutabilityError(
    `Invalid policy status transition: ${from} → ${to}`,
  );
}

export function assertPolicyVersionMonotonic(
  existingVersions: number[],
  nextVersion: number,
): void {
  const maxVersion = existingVersions.length > 0 ? Math.max(...existingVersions) : 0;
  if (nextVersion <= maxVersion) {
    throw new PolicyImmutabilityError(
      `Policy version must be monotonic: next=${nextVersion}, max=${maxVersion}`,
    );
  }
}
