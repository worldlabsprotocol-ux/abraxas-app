// FILE: lib/partner/launchpad/partnerFlowRequest/contract.ts
// Partner Flow request configuration. Pinned policy stays on the application.

import { HOLDER_GOOGLE_ACCOUNT_ONLY } from "@/lib/partner/holderExperience/contract";
import { INTEGRATION_STUDIO_PATH } from "@/lib/partner/integrationStudio/contract";
import { PARTNER_ACTIVATION_LAUNCHPAD } from "@/lib/partner/activationPath/contract";
import { SANDBOX_TEST_CONSOLE_CAPABILITIES } from "@/lib/partner/launchpad/sandboxTestConsole/contract";

export const PARTNER_FLOW_REQUEST_VERSION = "1.0.0" as const;
export const PARTNER_FLOW_REQUEST_ACTIVITY_CODE = "partner_flow_request_configured" as const;
export const PARTNER_FLOW_REQUEST_EVENT_TYPE = "partner_flow_request_configured" as const;
export const PARTNER_FLOW_REQUEST_ENTRY = "Configure Partner Flow" as const;
export const PARTNER_FLOW_CAPABILITY_REJECTED = "capability_rejected" as const;

export const PARTNER_FLOW_ACTIONS = [
  "retail_access",
  "membership_access",
  "residency_access",
  "wallet_bound_action",
  "redemption_access",
  "higher_assurance_identity",
  "sandbox_demo",
  "institutional_protocol_access",
] as const;
export type PartnerFlowAction = (typeof PARTNER_FLOW_ACTIONS)[number];

export const PARTNER_FLOW_ACTION_LABELS: Record<PartnerFlowAction, string> = {
  retail_access: "Storefront browse or checkout",
  membership_access: "Member-only surface",
  residency_access: "Region-limited product",
  wallet_bound_action: "Wallet-control action",
  redemption_access: "Collector or redemption",
  higher_assurance_identity: "Higher-assurance identity check",
  sandbox_demo: "Sandbox or testnet demo",
  institutional_protocol_access: "Sandbox institutional protocol access",
};

export const PARTNER_FLOW_CAPABILITIES = SANDBOX_TEST_CONSOLE_CAPABILITIES;
export type PartnerFlowCapability = (typeof PARTNER_FLOW_CAPABILITIES)[number];

export const PARTNER_FLOW_ALLOWED_KEYS = [
  "purpose",
  "action",
  "callback_index",
  "display_label",
  "capabilities",
] as const;

export const PARTNER_FLOW_FORBIDDEN_KEYS = [
  "policy_id",
  "policy_version",
  "environment",
  "partner_id",
  "api_key",
  "production",
  "claims",
  "assurance",
  "return_url",
  "receipt_id",
] as const;

export const PARTNER_FLOW_PURPOSE_MIN = 12;
export const PARTNER_FLOW_PURPOSE_MAX = 160;
export const PARTNER_FLOW_PURPOSE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9 .,'+\-]{10,159}$/;

export const PARTNER_FLOW_GOOGLE = HOLDER_GOOGLE_ACCOUNT_ONLY;

export const PARTNER_FLOW_REVIEW_NOTICE =
  "This configuration does not issue a receipt, start OAuth, activate Production, or create a continuation.";

export function launchpadConfigureHref(applicationId?: string | null): string {
  if (!applicationId) return `${PARTNER_ACTIVATION_LAUNCHPAD}?view=configure`;
  return `${PARTNER_ACTIVATION_LAUNCHPAD}?app=${encodeURIComponent(applicationId)}&view=configure`;
}

export function partnerFlowActionsForTemplate(templateId: string): readonly PartnerFlowAction[] {
  if (templateId === "sandbox_institutional_protocol_access") {
    return ["institutional_protocol_access"];
  }
  return PARTNER_FLOW_ACTIONS;
}

export function isPartnerFlowAction(value: string): value is PartnerFlowAction {
  return (PARTNER_FLOW_ACTIONS as readonly string[]).includes(value);
}

export function isPartnerFlowCapability(value: string): value is PartnerFlowCapability {
  return (PARTNER_FLOW_CAPABILITIES as readonly string[]).includes(value);
}

export const PARTNER_FLOW_NEXT_STEPS = {
  choose_policy: {
    id: "choose_policy",
    label: "Choose a policy pack",
    href: `${PARTNER_ACTIVATION_LAUNCHPAD}?view=policy`,
  },
  add_callback: {
    id: "add_callback",
    label: "Add an approved callback",
    href: `${PARTNER_ACTIVATION_LAUNCHPAD}?view=destinations`,
  },
  configure_app: {
    id: "configure_app",
    label: "Configure the sandbox app",
    href: PARTNER_ACTIVATION_LAUNCHPAD,
  },
  starter_kit: {
    id: "starter_kit",
    label: "Generate a Starter Kit",
    href: INTEGRATION_STUDIO_PATH,
  },
} as const;
