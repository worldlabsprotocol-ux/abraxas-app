// FILE: lib/passport/reusableCredential/institutionalPartnerCatalog.ts
// Server-side partner and policy resolution for reusable credential consent (untrusted client labels).

import "server-only";

import type { PartnerPolicyRules } from "@/lib/policy/types";
import { getPartnerPolicyDirect } from "@/lib/persistence/policyDirectStore";
import {
  buildInstitutionalSandboxFixtureCatalog,
  isPassportInstitutionalSandboxFixturesEnabled,
} from "./institutionalSandboxFixtures";

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

export async function resolveInstitutionalPartnerCatalogEntry(input: {
  partnerId: string;
  policyId: string;
  includeSandboxFixtures?: boolean;
}): Promise<InstitutionalPartnerCatalogEntry | null> {
  if (input.includeSandboxFixtures) {
    const sandbox = buildInstitutionalSandboxFixtureCatalog().find(
      (e) => e.partner_id === input.partnerId && e.policy_id === input.policyId,
    );
    if (sandbox) return sandbox;
  }

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

export async function listInstitutionalPartnerCatalogForConsent(input?: {
  includeSandboxFixtures?: boolean;
}): Promise<InstitutionalPartnerCatalogEntry[]> {
  const includeSandbox =
    input?.includeSandboxFixtures ?? isPassportInstitutionalSandboxFixturesEnabled();
  const entries: InstitutionalPartnerCatalogEntry[] = [];
  if (includeSandbox) {
    entries.push(...buildInstitutionalSandboxFixtureCatalog());
  }

  try {
    const { queryAbraxasPg } = await import("@/lib/persistence/pgPool");
    const { rows } = await queryAbraxasPg<{
      id: string;
      partner_id: string;
      version: number;
      name: string;
      rules_json: PartnerPolicyRules;
    }>(
      `select id, partner_id, version, name, rules_json
       from public.partner_policies
       where status = 'active'
       order by partner_id, id
       limit 50`,
    );
    for (const policy of rows) {
      if (entries.some((e) => e.partner_id === policy.partner_id && e.policy_id === policy.id)) {
        continue;
      }
      const rules = policy.rules_json as PartnerPolicyRules;
      entries.push({
        partner_id: policy.partner_id,
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
      });
    }
  } catch {
    /* postgres unavailable */
  }
  return entries;
}
