import { VERIFICATION_ISSUER_TRUST_RECORDS } from "@/lib/verification/issuerTrust/registry";
import { opaqueIssuerRef } from "@/lib/verification/issuerTrust/registry";
import type { OrganizationResultCategory } from "./contract";
import { organizationPolicyContract } from "./policies";

export interface OrganizationIssuerMapping {
  issuer_key: string;
  result_categories: readonly OrganizationResultCategory[];
  reviewed: true;
}

export const ORGANIZATION_ISSUER_MAPPINGS: readonly OrganizationIssuerMapping[] = [
  {
    issuer_key: "abraxas.organization_eligibility",
    result_categories: [
      "organization_eligible",
      "authorized_signer",
      "jurisdiction_eligible",
      "institutional_counterparty_eligible",
    ],
    reviewed: true,
  },
];

export function mapReviewedOrganizationIssuer(input: {
  issuer_key: string;
  result_category: OrganizationResultCategory;
  now?: number;
}): { ok: true; issuer_ref: string; method_category: string; assurance_level: string } | { ok: false; reason: string } {
  const policy = organizationPolicyContract(input.result_category);
  if (!policy) return { ok: false, reason: "unknown_policy" };
  const issuer = VERIFICATION_ISSUER_TRUST_RECORDS.find((row) => row.issuer_key === input.issuer_key);
  if (!issuer) return { ok: false, reason: "issuer_mapping_required" };
  if (issuer.method_category === "wallet_control" || issuer.method_category === "self_attestation" || issuer.method_category === "account_login") {
    return { ok: false, reason: "wallet_only_kyb" };
  }
  if (issuer.status !== "active") return { ok: false, reason: "issuer_mapping_required" };
  const now = input.now ?? Date.now();
  if (new Date(issuer.valid_from).getTime() > now) return { ok: false, reason: "issuer_mapping_required" };
  if (issuer.valid_until && new Date(issuer.valid_until).getTime() <= now) return { ok: false, reason: "issuer_mapping_required" };
  if (issuer.assurance_level === "L1") return { ok: false, reason: "issuer_mapping_required" };
  const mapping = ORGANIZATION_ISSUER_MAPPINGS.find((row) => row.issuer_key === input.issuer_key);
  if (!mapping || !mapping.result_categories.includes(input.result_category)) {
    return { ok: false, reason: "issuer_mapping_required" };
  }
  if (issuer.method_category !== policy.minimum_method) return { ok: false, reason: "issuer_mapping_required" };
  return {
    ok: true,
    issuer_ref: opaqueIssuerRef(issuer.issuer_key, issuer.record_version),
    method_category: issuer.method_category,
    assurance_level: issuer.assurance_level,
  };
}
