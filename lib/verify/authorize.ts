// FILE: lib/verify/authorize.ts
// Permission-based trust request authorization (Abraxas Verify entry point).

import { randomBytes } from "crypto";
import { isReturnUrlAllowed } from "@/lib/connect/returnUrlAllowlist";
import { resolveProtocolAppOrigin } from "@/lib/app/publicAppOrigin";
import { resolvePermissionForRelyingParty, PermissionResolutionError } from "@/lib/verify/resolvePermission";

const AUTH_TTL_MS = 30 * 60 * 1000;

export interface CreateVerifyAuthorizationInput {
  relyingPartyId: string;
  permission: string;
  permissionVersion?: string | null;
  redirectUri: string;
  state?: string | null;
  /** Trusted Abraxas origin for authorization_url (from request or SDK default). */
  appOrigin?: string;
}

export interface VerifyAuthorizationResult {
  trust_request_id: string;
  authorization_url: string;
  permission: string;
  permission_version: string;
  policy_id: string;
  expires_at: string;
  state: string | null;
}

function generateTrustRequestId(): string {
  return `tr_${randomBytes(12).toString("base64url")}`;
}

export function buildVerifyAuthorizationUrl(input: {
  relyingPartyId: string;
  permission: string;
  permissionVersion: string;
  policyId: string;
  redirectUri: string;
  state?: string | null;
  trustRequestId?: string;
  appOrigin?: string;
}): string {
  const base = resolveProtocolAppOrigin(input.appOrigin);
  const params = new URLSearchParams({
    relying_party_id: input.relyingPartyId,
    partner_id: input.relyingPartyId,
    permission: input.permission,
    permission_version: input.permissionVersion,
    policy_id: input.policyId,
    return_url: input.redirectUri,
  });
  if (input.state) params.set("state", input.state);
  if (input.trustRequestId) params.set("trust_request_id", input.trustRequestId);
  return `${base}/partner/verify?${params.toString()}`;
}

export async function createVerifyAuthorization(
  input: CreateVerifyAuthorizationInput,
): Promise<VerifyAuthorizationResult> {
  if (!await isReturnUrlAllowed(input.relyingPartyId, input.redirectUri)) {
    throw new Error("redirect_uri is not allowlisted for this relying party");
  }

  let resolved;
  try {
    resolved = resolvePermissionForRelyingParty({
      relyingPartyId: input.relyingPartyId,
      permission: input.permission,
      permissionVersion: input.permissionVersion,
    });
  } catch (e) {
    if (e instanceof PermissionResolutionError) throw e;
    throw e;
  }

  const trustRequestId = generateTrustRequestId();
  const expiresAt = new Date(Date.now() + AUTH_TTL_MS).toISOString();

  return {
    trust_request_id: trustRequestId,
    authorization_url: buildVerifyAuthorizationUrl({
      relyingPartyId: input.relyingPartyId,
      permission: resolved.permission,
      permissionVersion: resolved.permissionVersion,
      policyId: resolved.policyId,
      redirectUri: input.redirectUri,
      state: input.state,
      trustRequestId,
      appOrigin: input.appOrigin,
    }),
    permission: resolved.permission,
    permission_version: resolved.permissionVersion,
    policy_id: resolved.policyId,
    expires_at: expiresAt,
    state: input.state ?? null,
  };
}
