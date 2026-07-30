// FILE: lib/verify/resolveFlowParams.ts
// Resolve permission or policy_id for browser partner-flow evaluation.

import { resolvePermissionForRelyingParty, PermissionResolutionError } from "@/lib/verify/resolvePermission";

export function resolvePartnerFlowParams(input: {
  relyingPartyId: string;
  policyId?: string | null;
  permission?: string | null;
  permissionVersion?: string | null;
}): { policyId: string; permission?: string; permissionVersion?: string } {
  const policyId = input.policyId?.trim();
  const permission = input.permission?.trim();

  if (policyId) {
    return { policyId, permission: permission ?? undefined, permissionVersion: input.permissionVersion ?? undefined };
  }

  if (!permission) {
    throw new PermissionResolutionError("policy_id or permission is required", "unknown_permission");
  }

  const resolved = resolvePermissionForRelyingParty({
    relyingPartyId: input.relyingPartyId,
    permission,
    permissionVersion: input.permissionVersion,
  });

  return {
    policyId: resolved.policyId,
    permission: resolved.permission,
    permissionVersion: resolved.permissionVersion,
  };
}
