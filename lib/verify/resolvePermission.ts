// FILE: lib/verify/resolvePermission.ts
// Resolve permission → policy for a relying party (unversioned by default).

import {
  getPermissionDefinition,
  getRelyingPartyBinding,
  isPermissionAllowedForRelyingParty,
  type PermissionId,
} from "@/lib/verify/permissions";

export interface ResolvedPermission {
  permission: PermissionId;
  permissionVersion: string;
  policyId: string;
  consentLabel: string;
  trustLevel: number;
}

export class PermissionResolutionError extends Error {
  constructor(
    message: string,
    readonly code: "unknown_permission" | "not_allowed" | "unknown_version",
  ) {
    super(message);
    this.name = "PermissionResolutionError";
  }
}

export function resolvePermissionForRelyingParty(input: {
  relyingPartyId: string;
  permission: string;
  permissionVersion?: string | null;
}): ResolvedPermission {
  const def = getPermissionDefinition(input.permission);
  if (!def) {
    throw new PermissionResolutionError(
      `Unknown permission: ${input.permission}`,
      "unknown_permission",
    );
  }

  if (!isPermissionAllowedForRelyingParty(input.relyingPartyId, def.id)) {
    throw new PermissionResolutionError(
      `Permission ${def.id} is not allowed for relying party ${input.relyingPartyId}`,
      "not_allowed",
    );
  }

  const version = input.permissionVersion?.trim() || def.latestVersion;
  const binding = getRelyingPartyBinding(input.relyingPartyId);
  const overridePolicyId = binding?.policyOverrides?.[def.id]?.[version];
  const versionBinding = def.versions[version];
  if (!versionBinding && !overridePolicyId) {
    throw new PermissionResolutionError(
      `Unknown permission version: ${def.id}:${version}`,
      "unknown_version",
    );
  }

  const policyId = overridePolicyId ?? versionBinding!.policyId;

  return {
    permission: def.id,
    permissionVersion: version,
    policyId,
    consentLabel: def.consentLabel,
    trustLevel: def.trustLevel,
  };
}
