// FILE: lib/partner/activationPath/contract.ts
// Unified Discover → Create → Integrate → Test → Upgrade path on existing surfaces.

import { STARTER_KIT_PLACEHOLDERS } from "@/lib/partner/starterKit/contract";

export const PARTNER_ACTIVATION_PATH = "/developers/integration-studio" as const;
export const PARTNER_ACTIVATION_LAUNCHPAD = "/developers/launchpad" as const;

export const PARTNER_ACTIVATION_STAGES = [
  "discover",
  "create",
  "integrate",
  "test",
  "upgrade",
] as const;
export type PartnerActivationStage = (typeof PARTNER_ACTIVATION_STAGES)[number];

export const PARTNER_ACTIVATION_CREATE_CTA = "Create a sandbox integration" as const;
export const PARTNER_ACTIVATION_RESUME_CTA = "Resume your sandbox app" as const;

export const PARTNER_ACTIVATION_PRODUCTION = {
  self_issued: false as const,
  reviewed: true as const,
  deny_code: "production_denied" as const,
  notice:
    "Production access is requested through the existing reviewed Launchpad process after sandbox readiness. This path never issues a production key, activates Production, submits payments or trades, creates wallets, or moves funds.",
} as const;

export type PartnerActivationCapability =
  | "webhooks"
  | "trading_venue"
  | "payment_authorization"
  | "wallet_standard_binding";

export interface PartnerActivationChecklistItem {
  id: string;
  title: string;
  body: string;
  href: string;
  kit_file: string | null;
  required: boolean;
  capability: PartnerActivationCapability | null;
}

const CORE_CHECKLIST: PartnerActivationChecklistItem[] = [
  {
    id: "allowlisted_callback",
    title: "Configure allowlisted callback",
    body: "Register the development callback on the sandbox app. Hosted Partner Flow returns there with a receipt_id only.",
    href: "/docs/partner-flow",
    kit_file: ".env.example",
    required: true,
    capability: null,
  },
  {
    id: "hosted_partner_flow",
    title: "Start Hosted Partner Flow",
    body: "Redirect the holder to hosted verification. Callback query keys are not authorization.",
    href: "/docs/partner-flow",
    kit_file: "README.md",
    required: true,
    capability: null,
  },
  {
    id: "verify_receipt",
    title: "Verify a receipt from the server",
    body: "Fetch GET /api/receipts/{id}/public and evaluate currently_valid on your backend.",
    href: "/verify?mode=receipt",
    kit_file: "README.md",
    required: true,
    capability: null,
  },
  {
    id: "webhooks",
    title: "Configure signed webhooks",
    body: "Verify HMAC, ignore duplicates, then re-fetch the public receipt. A webhook body is never a grant.",
    href: "/docs/partner-flow",
    kit_file: "README.md",
    required: false,
    capability: "webhooks",
  },
  {
    id: "trading_preflight",
    title: "Use trading preflight only if selected",
    body: "Enable market access is a policy preflight. Abraxas does not execute trades.",
    href: "/examples/trading-venue",
    kit_file: null,
    required: false,
    capability: "trading_venue",
  },
  {
    id: "payment_preflight",
    title: "Use payment preflight only if selected",
    body: "Checkout authorization is a policy preflight. Abraxas does not move money.",
    href: "/examples/payment-authorization",
    kit_file: null,
    required: false,
    capability: "payment_authorization",
  },
  {
    id: "wallet_binding",
    title: "Optional message-only Wallet Standard binding",
    body: "Bind a wallet to one action contract. Never sign a transaction or treat a wallet as identity.",
    href: "/docs/wallet-standard-binding",
    kit_file: null,
    required: false,
    capability: "wallet_standard_binding",
  },
];

export function buildPartnerActivationChecklist(
  capabilities: readonly string[] = [],
): PartnerActivationChecklistItem[] {
  const selected = new Set(capabilities);
  return CORE_CHECKLIST.filter((item) => item.required || (item.capability && selected.has(item.capability)));
}

export function launchpadResumeHref(applicationId?: string | null): string {
  if (!applicationId) return PARTNER_ACTIVATION_LAUNCHPAD;
  return `${PARTNER_ACTIVATION_LAUNCHPAD}?app=${encodeURIComponent(applicationId)}`;
}

export { launchpadSandboxTestHref } from "@/lib/partner/launchpad/sandboxTestConsole/contract";

export function selectLaunchpadResumeAppId(
  applications: Array<{ id: string }>,
  requestedId?: string | null,
): string | null {
  if (requestedId && applications.some((app) => app.id === requestedId)) return requestedId;
  return applications[0]?.id ?? null;
}

export function partnerActivationPublicView(input?: { capabilities?: readonly string[] }) {
  return {
    path: PARTNER_ACTIVATION_PATH,
    stages: PARTNER_ACTIVATION_STAGES,
    create_cta: PARTNER_ACTIVATION_CREATE_CTA,
    resume_cta: PARTNER_ACTIVATION_RESUME_CTA,
    launchpad_href: PARTNER_ACTIVATION_LAUNCHPAD,
    production: PARTNER_ACTIVATION_PRODUCTION,
    placeholders: STARTER_KIT_PLACEHOLDERS,
    checklist: buildPartnerActivationChecklist(input?.capabilities ?? []),
    identity_from: "console_session",
    issues_production_key: false,
    moves_funds: false,
  };
}
