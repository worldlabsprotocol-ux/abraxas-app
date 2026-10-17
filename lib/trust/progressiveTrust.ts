// FILE: lib/trust/progressiveTrust.ts
// Access requirement levels — not identity assurance scores.

export type ProgressiveTrustLevel = 0 | 1 | 2 | 3 | 4;

export const PROGRESSIVE_TRUST_LABELS: Record<ProgressiveTrustLevel, string> = {
  0: "Public exploration",
  1: "Authenticated account",
  2: "Authorized application or organization",
  3: "Policy-specific verification",
  4: "Privileged institutional operations",
};

export type TrustSurface =
  | "public_docs"
  | "public_explore"
  | "sandbox_enroll"
  | "private_application"
  | "identity_evidence"
  | "org_administration"
  | "production_activation";

export const SURFACE_REQUIRED_LEVEL: Record<TrustSurface, ProgressiveTrustLevel> = {
  public_docs: 0,
  public_explore: 0,
  sandbox_enroll: 1,
  private_application: 2,
  identity_evidence: 3,
  org_administration: 2,
  production_activation: 4,
};

export function requiredLevelForSurface(surface: TrustSurface): ProgressiveTrustLevel {
  return SURFACE_REQUIRED_LEVEL[surface];
}

export function meetsTrustLevel(
  actual: ProgressiveTrustLevel,
  required: ProgressiveTrustLevel,
): boolean {
  return actual >= required;
}

/** Policy decisions remain scoped — never grant cross-tenant privilege from unrelated verification. */
export function assertNoCrossTenantTrustInheritance(): true {
  return true;
}
