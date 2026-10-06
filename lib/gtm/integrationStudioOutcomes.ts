// FILE: lib/gtm/integrationStudioOutcomes.ts
// Outcome-first Integration Studio entry — maps goals to default paths.

import type { IntegrationStudioPathId } from "@/lib/partner/integrationStudio/contract";
import type { PolicyPackId } from "@/lib/partner/launchpad/policyPacks";

export type IntegrationStudioOutcomeId =
  | "reuse_across_app"
  | "narrow_without_extra_id"
  | "new_eligibility_rule"
  | "transaction_action"
  | "content_origin";

export interface IntegrationStudioOutcome {
  id: IntegrationStudioOutcomeId;
  title: string;
  buyerSummary: string;
  engineeringSummary: string;
  defaultPathId: IntegrationStudioPathId;
  defaultPackId: PolicyPackId;
  studioHref: string;
  icpPriority: boolean;
}

function studioHref(outcome: IntegrationStudioOutcomeId, path: IntegrationStudioPathId, pack: PolicyPackId): string {
  const params = new URLSearchParams({
    outcome,
    path,
    pack,
    source: "gtm-studio",
  });
  return `/developers/integration-studio?${params.toString()}`;
}

export const INTEGRATION_STUDIO_OUTCOMES: Record<IntegrationStudioOutcomeId, IntegrationStudioOutcome> = {
  reuse_across_app: {
    id: "reuse_across_app",
    title: "Reuse verification across another app",
    buyerSummary:
      "Keep your KYC provider. Stop rebuilding verification for every new gated product when compatible evidence can be reused.",
    engineeringSummary:
      "Default: identity plus liveness pack with reuse-enabled evidence freshness. Server-verify each application result.",
    defaultPathId: "verify_with_abraxas",
    defaultPackId: "identity_liveness",
    studioHref: studioHref(
      "reuse_across_app",
      "verify_with_abraxas",
      "identity_liveness",
    ),
    icpPriority: true,
  },
  narrow_without_extra_id: {
    id: "narrow_without_extra_id",
    title: "Verify a user without collecting extra identity data",
    buyerSummary:
      "Receive the eligibility answer your application needs — not birth dates, document images, or full provider payloads.",
    engineeringSummary: "Default: hosted Partner Flow with age 21 retail pack and server receipt verification.",
    defaultPathId: "hosted_partner_flow",
    defaultPackId: "age_21_retail",
    studioHref: studioHref("narrow_without_extra_id", "hosted_partner_flow", "age_21_retail"),
    icpPriority: false,
  },
  new_eligibility_rule: {
    id: "new_eligibility_rule",
    title: "Add a new eligibility rule",
    buyerSummary:
      "Configure a new gate and integration path without rebuilding your entire onboarding stack from scratch.",
    engineeringSummary: "Default: hosted Partner Flow with policy pack selection and starter kit generation.",
    defaultPathId: "hosted_partner_flow",
    defaultPackId: "age_21_retail",
    studioHref: studioHref("new_eligibility_rule", "hosted_partner_flow", "age_21_retail"),
    icpPriority: false,
  },
  transaction_action: {
    id: "transaction_action",
    title: "Verify at a transaction or action",
    buyerSummary:
      "Gate a high-trust action with a current verified result — at checkout, transfer, or protocol access time.",
    engineeringSummary: "Default: Solana onchain eligibility gate pattern (advanced paths available).",
    defaultPathId: "solana_onchain_eligibility_gate",
    defaultPackId: "age_21_retail",
    studioHref: studioHref("transaction_action", "solana_onchain_eligibility_gate", "age_21_retail"),
    icpPriority: false,
  },
  content_origin: {
    id: "content_origin",
    title: "Prove content origin",
    buyerSummary:
      "Bind a disclosure and integrity result to a published artifact without receiving the underlying file.",
    engineeringSummary: "Default: content origin disclosure pack with reference publisher demo.",
    defaultPathId: "verify_with_abraxas",
    defaultPackId: "content_origin_disclosure",
    studioHref: studioHref("content_origin", "verify_with_abraxas", "content_origin_disclosure"),
    icpPriority: false,
  },
};

export const INTEGRATION_STUDIO_OUTCOME_LIST = Object.values(INTEGRATION_STUDIO_OUTCOMES);

export function isIntegrationStudioOutcomeId(value: string): value is IntegrationStudioOutcomeId {
  return value in INTEGRATION_STUDIO_OUTCOMES;
}

export const FINTECH_REUSE_STUDIO_COPY = {
  headline: "Keep your KYC provider. Stop rebuilding KYC for every app.",
  body:
    "Abraxas sits after trusted verification. Your provider verifies the customer. Abraxas determines which verified facts can satisfy each application's policy. The application receives the answer it is authorized to use. Compatible evidence may be reused with freshness, consent, and revocation controls.",
} as const;
