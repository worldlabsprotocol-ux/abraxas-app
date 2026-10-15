// FILE: lib/passport/reusableCredential/institutionalPresentationPolicy.ts

import "server-only";

import type { PartnerPolicyRules } from "@/lib/policy/types";
import type { SignedPassportReusableCredential } from "./contract";
import {
  resolveInstitutionalPartnerCatalogEntry,
  type InstitutionalPartnerCatalogEntry,
} from "./institutionalPartnerCatalog";
import { isPassportInstitutionalSandboxFixturesEnabled } from "./institutionalSandboxFixtures";

export type ResolvePresentationPartnerPolicyResult =
  | { ok: true; entry: InstitutionalPartnerCatalogEntry }
  | { ok: false; code: "unknown_partner_or_policy" | "policy_inactive" | "issuer_not_permitted_for_policy" };

export function credentialIssuerPermittedForPolicyRules(input: {
  credentialIssuerId: string;
  policyRules: PartnerPolicyRules;
}): boolean {
  const required = input.policyRules.required_claims ?? [];
  if (!required.length) return true;
  for (const rule of required) {
    const accepted = rule.accepted_issuers;
    if (accepted?.length && !accepted.includes(input.credentialIssuerId)) {
      return false;
    }
  }
  return true;
}

export async function resolvePresentationPartnerPolicy(input: {
  partnerId: string;
  policyId: string;
  credential: SignedPassportReusableCredential;
  env?: Record<string, string | undefined>;
}): Promise<ResolvePresentationPartnerPolicyResult> {
  const env = input.env ?? (process.env as Record<string, string | undefined>);
  const isSandboxCredential = input.credential.payload.provenance.idv_method === "sandbox_fixture";
  if (isSandboxCredential && !isPassportInstitutionalSandboxFixturesEnabled(env)) {
    return { ok: false, code: "unknown_partner_or_policy" };
  }

  const entry = await resolveInstitutionalPartnerCatalogEntry({
    partnerId: input.partnerId,
    policyId: input.policyId,
    includeSandboxFixtures: isSandboxCredential,
  });
  if (!entry) {
    return { ok: false, code: "unknown_partner_or_policy" };
  }
  if (entry.sandbox_labeled && !isSandboxCredential) {
    return { ok: false, code: "policy_inactive" };
  }
  if (!isSandboxCredential && entry.policy_rules.sandbox_only) {
    return { ok: false, code: "policy_inactive" };
  }
  if (
    !credentialIssuerPermittedForPolicyRules({
      credentialIssuerId: input.credential.payload.issuer_id,
      policyRules: entry.policy_rules,
    })
  ) {
    return { ok: false, code: "issuer_not_permitted_for_policy" };
  }
  return { ok: true, entry };
}
