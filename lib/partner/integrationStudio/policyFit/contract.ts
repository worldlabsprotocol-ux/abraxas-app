// FILE: lib/partner/integrationStudio/policyFit/contract.ts
// Structured policy-fit choices. Catalog packs remain the only match target.

import { INTEGRATION_STUDIO_GOOGLE, INTEGRATION_STUDIO_PROVISION } from "@/lib/partner/integrationStudio/contract";
import { POLICY_PACK_CATALOG_VERSION, type PolicyPackId } from "@/lib/partner/launchpad/policyPacks";
import type { IntegrationStudioPathId } from "@/lib/partner/integrationStudio/contract";

export const POLICY_FIT_VERSION = "1.0.0" as const;
export const POLICY_FIT_API_PATH = "/api/developers/integration-studio/policy-fit" as const;

export const POLICY_FIT_ACTIONS = [
  "retail_access",
  "membership_access",
  "residency_access",
  "wallet_bound_action",
  "redemption_access",
  "higher_assurance_identity",
  "sandbox_demo",
] as const;
export type PolicyFitAction = (typeof POLICY_FIT_ACTIONS)[number];

export const POLICY_FIT_ACTION_LABELS: Record<PolicyFitAction, string> = {
  retail_access: "Gate storefront browse or checkout",
  membership_access: "Gate a member-only surface",
  residency_access: "Gate a region-limited product",
  wallet_bound_action: "Gate an action that needs wallet control",
  redemption_access: "Gate collector or redemption access",
  higher_assurance_identity: "Gate a higher-assurance identity check",
  sandbox_demo: "Exercise a sandbox or testnet demo",
};

export const POLICY_FIT_CATEGORIES = [
  "age_18",
  "age_21",
  "residency",
  "membership",
  "wallet_control",
  "identity_liveness",
  "collector_redemption",
  "sandbox_demo",
] as const;
export type PolicyFitCategory = (typeof POLICY_FIT_CATEGORIES)[number];

export const POLICY_FIT_CATEGORY_LABELS: Record<PolicyFitCategory, string> = {
  age_18: "Age 18 eligibility",
  age_21: "Age 21 eligibility",
  residency: "Residency or jurisdiction",
  membership: "Membership or credential",
  wallet_control: "Wallet control",
  identity_liveness: "Identity plus liveness",
  collector_redemption: "Collector or redemption",
  sandbox_demo: "Sandbox economic demo",
};

export const POLICY_FIT_ENVIRONMENTS = ["sandbox", "future_production"] as const;
export type PolicyFitEnvironment = (typeof POLICY_FIT_ENVIRONMENTS)[number];

export const POLICY_FIT_ENVIRONMENT_LABELS: Record<PolicyFitEnvironment, string> = {
  sandbox: "Sandbox or testnet",
  future_production: "Intended for a future Production review",
};

export const POLICY_FIT_CAPABILITIES = [
  "reusable_result",
  "webhook",
  "trading_preflight",
  "payment_preflight",
  "wallet_standard_binding",
  "solana_gate",
] as const;
export type PolicyFitCapability = (typeof POLICY_FIT_CAPABILITIES)[number];

export const POLICY_FIT_CAPABILITY_LABELS: Record<PolicyFitCapability, string> = {
  reusable_result: "Reusable policy result",
  webhook: "Webhook notifications",
  trading_preflight: "Trading preflight",
  payment_preflight: "Payment preflight",
  wallet_standard_binding: "Wallet Standard binding",
  solana_gate: "Solana eligibility gate",
};

export const POLICY_FIT_ALLOWED_KEYS = [
  "action",
  "category",
  "environment",
  "capabilities",
] as const;

export const POLICY_FIT_FORBIDDEN_KEYS = [
  "policy_version",
  "pack_id",
  "production_activation",
  "api_key",
  "wallet_address",
  "email",
  "holder",
] as const;

export const POLICY_FIT_CATEGORY_TO_PACK: Record<PolicyFitCategory, PolicyPackId> = {
  age_18: "age_18_retail",
  age_21: "age_21_retail",
  residency: "residency_us",
  membership: "membership_credential",
  wallet_control: "wallet_control",
  identity_liveness: "identity_liveness",
  collector_redemption: "collector_redemption",
  sandbox_demo: "sandbox_economic_demo",
};

export const POLICY_FIT_ACTION_CATEGORIES: Record<PolicyFitAction, readonly PolicyFitCategory[]> = {
  retail_access: ["age_18", "age_21"],
  membership_access: ["membership"],
  residency_access: ["residency"],
  wallet_bound_action: ["wallet_control"],
  redemption_access: ["collector_redemption"],
  higher_assurance_identity: ["identity_liveness"],
  sandbox_demo: ["sandbox_demo"],
};

export const POLICY_FIT_CAPABILITY_TO_PATH: Record<PolicyFitCapability, IntegrationStudioPathId> = {
  reusable_result: "hosted_partner_flow",
  webhook: "webhook_events",
  trading_preflight: "trading_venue",
  payment_preflight: "payment_authorization",
  wallet_standard_binding: "wallet_standard_binding",
  solana_gate: "solana_gate",
};

export const POLICY_FIT_NO_FIT =
  "No existing policy pack matches these choices. Talk to us about a policy fit. A new or Production policy requires review. This planner does not invent a custom pack or promise approval.";

export const POLICY_FIT_REVIEW_NOTICE =
  "A new or Production policy requires review. This planner never issues Production access, custom policies, or approval.";

export const POLICY_FIT_GOOGLE = INTEGRATION_STUDIO_GOOGLE;

export const POLICY_FIT_DESIGN_PARTNER_HREF = INTEGRATION_STUDIO_PROVISION.apply_href;

export const POLICY_FIT_CATALOG_VERSION = POLICY_PACK_CATALOG_VERSION;

export function isPolicyFitAction(value: string): value is PolicyFitAction {
  return (POLICY_FIT_ACTIONS as readonly string[]).includes(value);
}

export function isPolicyFitCategory(value: string): value is PolicyFitCategory {
  return (POLICY_FIT_CATEGORIES as readonly string[]).includes(value);
}

export function isPolicyFitEnvironment(value: string): value is PolicyFitEnvironment {
  return (POLICY_FIT_ENVIRONMENTS as readonly string[]).includes(value);
}

export function isPolicyFitCapability(value: string): value is PolicyFitCapability {
  return (POLICY_FIT_CAPABILITIES as readonly string[]).includes(value);
}

export function policyFitPublicChoices() {
  return {
    version: POLICY_FIT_VERSION,
    catalog_version: POLICY_FIT_CATALOG_VERSION,
    actions: POLICY_FIT_ACTIONS.map((id) => ({ id, label: POLICY_FIT_ACTION_LABELS[id] })),
    categories: POLICY_FIT_CATEGORIES.map((id) => ({ id, label: POLICY_FIT_CATEGORY_LABELS[id] })),
    environments: POLICY_FIT_ENVIRONMENTS.map((id) => ({ id, label: POLICY_FIT_ENVIRONMENT_LABELS[id] })),
    capabilities: POLICY_FIT_CAPABILITIES.map((id) => ({ id, label: POLICY_FIT_CAPABILITY_LABELS[id] })),
    google_is_account_only: POLICY_FIT_GOOGLE,
    review_notice: POLICY_FIT_REVIEW_NOTICE,
  };
}
