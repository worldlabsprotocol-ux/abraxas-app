// FILE: lib/partner/launchpad/policyTruth.ts
// Canonical policy truth sources — UI must derive from these, never duplicate.

/**
 * Canonical sources (single truth):
 *
 * - Pack registry: lib/partner/launchpad/policyPacks.ts (POLICY_PACKS)
 * - Launchpad templates: lib/partner/launchpad/policyCatalog.ts (derived from packs)
 * - Public catalog API: app/api/launchpad/policies/route.ts
 * - Materialized partner policies: partner_policies (id, version)
 * - Application primary binding: partner_launchpad_applications.policy_*
 * - Application policy bindings (multi-policy): partner_launchpad_application_policies (migration 116)
 * - Compatibility edges: lib/policy/compatibilityEdge/registry.ts
 * - Reuse evaluation: lib/passport/reusableEligibility/compatibility.ts
 * - Production activation: lib/partner/launchpad/productionActivation/* (per application, primary policy)
 * - Policy consumption metrics: partner_integration_events via pilotEvidence/valueEvidence
 * - verifyForAction: lib/partner/integrationKit/client.ts (single policy per kit instance)
 */

export const CANONICAL_POLICY_PACK_REGISTRY = "lib/partner/launchpad/policyPacks.ts" as const;
export const CANONICAL_POLICY_CATALOG_API = "/api/launchpad/policies" as const;
