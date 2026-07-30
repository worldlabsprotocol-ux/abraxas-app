// FILE: lib/verify/permissions.ts
// Abraxas Verify permission registry — stable relying-party contract.

import {
  GOOD_TROUBLE_PARTNER_ID,
  GOOD_TROUBLE_RETAIL_POLICY_ID,
} from "@/lib/goodTrouble/constants";

export type PermissionId =
  | "regulated_purchase"
  | "identity_verification"
  | "event_entry"
  | "vip_access"
  | "property_transfer"
  | "ownership_verification"
  | "accredited_investor"
  | "kyb"
  | "aml_screening";

export interface PermissionVersionBinding {
  policyId: string;
}

export interface PermissionDefinition {
  id: PermissionId;
  /** Human-readable label for consent screens */
  consentLabel: string;
  /** Minimum trust level required (permission-facing abstraction) */
  trustLevel: number;
  latestVersion: string;
  versions: Record<string, PermissionVersionBinding>;
}

/** Per-relying-party permission allowlist and policy bindings */
export interface RelyingPartyPermissionBinding {
  relyingPartyId: string;
  allowedPermissions: PermissionId[];
  /** Override default policy for a permission version */
  policyOverrides?: Partial<Record<PermissionId, Partial<Record<string, string>>>>;
}

const PERMISSIONS: Record<PermissionId, PermissionDefinition> = {
  regulated_purchase: {
    id: "regulated_purchase",
    consentLabel: "Eligible for regulated purchase",
    trustLevel: 2,
    latestVersion: "v1",
    versions: {
      v1: { policyId: GOOD_TROUBLE_RETAIL_POLICY_ID },
    },
  },
  identity_verification: {
    id: "identity_verification",
    consentLabel: "Identity verified",
    trustLevel: 2,
    latestVersion: "v1",
    versions: {
      v1: { policyId: "abraxas-booking-v1" },
    },
  },
  event_entry: {
    id: "event_entry",
    consentLabel: "Verified for event entry",
    trustLevel: 2,
    latestVersion: "v1",
    versions: { v1: { policyId: "abraxas-booking-v1" } },
  },
  vip_access: {
    id: "vip_access",
    consentLabel: "VIP access verified",
    trustLevel: 2,
    latestVersion: "v1",
    versions: { v1: { policyId: "abraxas-verified-participant-v1" } },
  },
  property_transfer: {
    id: "property_transfer",
    consentLabel: "Verified for property transfer",
    trustLevel: 3,
    latestVersion: "v1",
    versions: { v1: { policyId: "abraxas-rwa-us-v1" } },
  },
  ownership_verification: {
    id: "ownership_verification",
    consentLabel: "Asset ownership verified",
    trustLevel: 3,
    latestVersion: "v1",
    versions: { v1: { policyId: "abraxas-rwa-us-v1" } },
  },
  accredited_investor: {
    id: "accredited_investor",
    consentLabel: "Accredited investor status verified",
    trustLevel: 3,
    latestVersion: "v1",
    versions: { v1: { policyId: "abraxas-rwa-us-v1" } },
  },
  kyb: {
    id: "kyb",
    consentLabel: "Business verification complete",
    trustLevel: 3,
    latestVersion: "v1",
    versions: { v1: { policyId: "abraxas-rwa-us-v1" } },
  },
  aml_screening: {
    id: "aml_screening",
    consentLabel: "AML screening cleared",
    trustLevel: 2,
    latestVersion: "v1",
    versions: { v1: { policyId: "abraxas-rwa-us-v1" } },
  },
};

const RELYING_PARTY_BINDINGS: RelyingPartyPermissionBinding[] = [
  {
    relyingPartyId: GOOD_TROUBLE_PARTNER_ID,
    allowedPermissions: ["regulated_purchase", "identity_verification"],
    policyOverrides: {
      regulated_purchase: { v1: GOOD_TROUBLE_RETAIL_POLICY_ID },
    },
  },
];

export function listPermissionDefinitions(): PermissionDefinition[] {
  return Object.values(PERMISSIONS);
}

export function getPermissionDefinition(permission: string): PermissionDefinition | null {
  return PERMISSIONS[permission as PermissionId] ?? null;
}

export function getRelyingPartyBinding(relyingPartyId: string): RelyingPartyPermissionBinding | null {
  return RELYING_PARTY_BINDINGS.find(b => b.relyingPartyId === relyingPartyId) ?? null;
}

export function isPermissionAllowedForRelyingParty(
  relyingPartyId: string,
  permission: PermissionId,
): boolean {
  const binding = getRelyingPartyBinding(relyingPartyId);
  if (!binding) return false;
  return binding.allowedPermissions.includes(permission);
}

export function permissionForPolicyId(policyId: string): {
  permission: PermissionId;
  version: string;
} | null {
  for (const def of Object.values(PERMISSIONS)) {
    for (const [version, binding] of Object.entries(def.versions)) {
      if (binding.policyId === policyId) {
        return { permission: def.id, version };
      }
    }
  }
  return null;
}
