// FILE: lib/passport/reusableCredential/institutionalPartnerCatalog.ts
// Server-side partner and policy resolution for reusable credential consent (untrusted client labels).

import "server-only";

import type { PartnerPolicyRules } from "@/lib/policy/types";
import { getPartnerPolicyDirect } from "@/lib/persistence/policyDirectStore";
import {
  BUILD_566_PARTNER_A,
  BUILD_566_PARTNER_B,
  BUILD_566_POLICY_ID,
  BUILD_566_POLICY_RULES,
} from "./fixtures";

export type InstitutionalPartnerCatalogEntry = {
  partner_id: string;
  partner_display_name: string;
  policy_id: string;
  policy_version: number;
  policy_rules: PartnerPolicyRules;
  requested_attribute: string;
  purpose: string;
  disclosure_summary: string[];
  issuer_id: string;
  sandbox_labeled: boolean;
};

const SANDBOX_CATALOG: InstitutionalPartnerCatalogEntry[] = [
  {
    partner_id: BUILD_566_PARTNER_A,
    partner_display_name: "Institutional RP Example",
    policy_id: BUILD_566_POLICY_ID,
    policy_version: 1,
    policy_rules: { ...BUILD_566_POLICY_RULES, sandbox_only: false },
    requested_attribute: "product_eligibility (over 21)",
    purpose: "Age-gated institutional access without collecting identity documents again.",
    disclosure_summary: [
      "Product eligibility outcome only",
      "No document images or biometrics",
      "Partner-bound authorization receipt",
    ],
    issuer_id: "issuer:abraxas",
    sandbox_labeled: false,
  },
  {
    partner_id: BUILD_566_PARTNER_B,
    partner_display_name: "Sandbox Partner Beta",
    policy_id: BUILD_566_POLICY_ID,
    policy_version: 1,
    policy_rules: { ...BUILD_566_POLICY_RULES, sandbox_only: false },
    requested_attribute: "product_eligibility (over 21)",
    purpose: "Independent second relying party verification using the same reusable credential.",
    disclosure_summary: [
      "Product eligibility outcome only",
      "Separate receipt from Partner A",
      "No cross-institution receipt reuse",
    ],
    issuer_id: "issuer:abraxas",
    sandbox_labeled: false,
  },
];

export async function resolveInstitutionalPartnerCatalogEntry(input: {
  partnerId: string;
  policyId: string;
}): Promise<InstitutionalPartnerCatalogEntry | null> {
  const sandbox = SANDBOX_CATALOG.find(
    (e) => e.partner_id === input.partnerId && e.policy_id === input.policyId,
  );
  if (sandbox) return sandbox;

  let policy: Awaited<ReturnType<typeof getPartnerPolicyDirect>> = null;
  try {
    policy = await getPartnerPolicyDirect(input.policyId);
  } catch {
    return null;
  }
  if (!policy || policy.id !== input.policyId) return null;
  if (policy.partner_id && policy.partner_id !== input.partnerId) return null;

  const rules = policy.rules_json as PartnerPolicyRules;
  return {
    partner_id: input.partnerId,
    partner_display_name: policy.name || policy.partner_id,
    policy_id: policy.id,
    policy_version: policy.version ?? 1,
    policy_rules: rules,
    requested_attribute: "policy-scoped eligibility claims",
    purpose: policy.name || "Institutional verification under pinned partner policy.",
    disclosure_summary: [
      "Policy-scoped claim outcomes only",
      "No underlying identity evidence leaves Abraxas custody",
      "Partner-bound signed authorization receipt",
    ],
    issuer_id: "issuer:abraxas",
    sandbox_labeled: Boolean(rules.sandbox_only),
  };
}

export async function listInstitutionalPartnerCatalogForConsent(): Promise<InstitutionalPartnerCatalogEntry[]> {
  const entries: InstitutionalPartnerCatalogEntry[] = [...SANDBOX_CATALOG];
  return entries;
}
