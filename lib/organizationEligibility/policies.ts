// FILE: lib/organizationEligibility/policies.ts
// Source-controlled organization policy contracts. Not self-serve live packs.

import type { OrganizationResultCategory } from "./contract";
import { ORGANIZATION_NO_WALLET_KYB } from "./contract";

export interface OrganizationPolicyContract {
  id: OrganizationResultCategory;
  display_name: string;
  catalog_path: "policy_proposal_release_candidate_reviewed_catalog";
  automatically_active: false;
  self_publishable: false;
  live_policy: false;
  minimum_method: "privacy_preserving";
  minimum_assurance: "L2";
  wallet_control_qualifies: false;
  selective_disclosure: string;
  withheld: string[];
  disclosed_result: string;
}

export const ORGANIZATION_POLICY_CONTRACTS: Record<OrganizationResultCategory, OrganizationPolicyContract> = {
  organization_eligible: {
    id: "organization_eligible",
    display_name: "Organization eligible",
    catalog_path: "policy_proposal_release_candidate_reviewed_catalog",
    automatically_active: false,
    self_publishable: false,
    live_policy: false,
    minimum_method: "privacy_preserving",
    minimum_assurance: "L2",
    wallet_control_qualifies: false,
    selective_disclosure: "organization_eligible: approved for one partner, purpose, action, and expiry.",
    withheld: ["legal name", "incorporation documents", "beneficial owners", "tax IDs", "addresses"],
    disclosed_result: "organization_eligible",
  },
  authorized_signer: {
    id: "authorized_signer",
    display_name: "Authorized signer eligible",
    catalog_path: "policy_proposal_release_candidate_reviewed_catalog",
    automatically_active: false,
    self_publishable: false,
    live_policy: false,
    minimum_method: "privacy_preserving",
    minimum_assurance: "L2",
    wallet_control_qualifies: false,
    selective_disclosure: "authorized_signer: approved for one named action and expiry.",
    withheld: ["signer legal name", "board minutes", "beneficial owners", "wallet private keys"],
    disclosed_result: "authorized_signer",
  },
  jurisdiction_eligible: {
    id: "jurisdiction_eligible",
    display_name: "Jurisdiction eligible",
    catalog_path: "policy_proposal_release_candidate_reviewed_catalog",
    automatically_active: false,
    self_publishable: false,
    live_policy: false,
    minimum_method: "privacy_preserving",
    minimum_assurance: "L2",
    wallet_control_qualifies: false,
    selective_disclosure: "jurisdiction_eligible: approved for one partner and expiry.",
    withheld: ["registered address", "tax residency documents", "incorporation country evidence"],
    disclosed_result: "jurisdiction_eligible",
  },
  institutional_counterparty_eligible: {
    id: "institutional_counterparty_eligible",
    display_name: "Institutional counterparty eligible",
    catalog_path: "policy_proposal_release_candidate_reviewed_catalog",
    automatically_active: false,
    self_publishable: false,
    live_policy: false,
    minimum_method: "privacy_preserving",
    minimum_assurance: "L2",
    wallet_control_qualifies: false,
    selective_disclosure: "institutional_counterparty_eligible: approved for one partner, action, and expiry.",
    withheld: ["counterparty legal name", "beneficial owners", "sanctions lists", "KYB files"],
    disclosed_result: "institutional_counterparty_eligible",
  },
};

export function organizationPolicyContract(id: string): OrganizationPolicyContract | null {
  if (!(id in ORGANIZATION_POLICY_CONTRACTS)) return null;
  return ORGANIZATION_POLICY_CONTRACTS[id as OrganizationResultCategory];
}

export function organizationPolicyPublicCatalog() {
  return {
    catalog_path: "policy_proposal_release_candidate_reviewed_catalog" as const,
    automatically_active: false as const,
    self_publishable: false as const,
    live_policy: false as const,
    wallet_kyb_notice: ORGANIZATION_NO_WALLET_KYB,
    contracts: Object.values(ORGANIZATION_POLICY_CONTRACTS).map((row) => ({
      id: row.id,
      display_name: row.display_name,
      live_policy: false as const,
      automatically_active: false as const,
      minimum_method: row.minimum_method,
      minimum_assurance: row.minimum_assurance,
      wallet_control_qualifies: false as const,
      disclosed_result: row.disclosed_result,
      withheld: row.withheld,
    })),
  };
}
