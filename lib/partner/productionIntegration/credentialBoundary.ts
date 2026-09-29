// FILE: lib/partner/productionIntegration/credentialBoundary.ts
// Sandbox/live credential isolation. Fail closed on environment mismatch.

export type PartnerCredentialEnvironment = "sandbox" | "production";

export type CredentialBoundaryFailure =
  | "credential_missing"
  | "credential_revoked"
  | "credential_wrong_environment"
  | "credential_wrong_partner"
  | "credential_wrong_application"
  | "credential_inactive_app"
  | "live_credential_not_reviewed"
  | "client_cannot_issue_live";

export interface PartnerCredentialContext {
  keyPrefix: string;
  partnerId: string;
  apiKeyId: string;
  revoked: boolean;
  launchpadApplicationId?: string | null;
}

export function partnerKeyEnvironment(keyPrefix: string): PartnerCredentialEnvironment | null {
  if (keyPrefix.startsWith("abx_test_")) return "sandbox";
  if (keyPrefix.startsWith("abx_live_")) return "production";
  return null;
}

export function validatePartnerCredentialBoundary(input: {
  credential: PartnerCredentialContext | null;
  expectedEnvironment: PartnerCredentialEnvironment;
  expectedPartnerId: string;
  expectedApplicationId?: string;
  applicationStatus?: string;
  productionAccessApproved?: boolean;
}): { ok: true } | { ok: false; errors: CredentialBoundaryFailure[] } {
  const errors: CredentialBoundaryFailure[] = [];
  if (!input.credential) {
    errors.push("credential_missing");
    return { ok: false, errors };
  }

  if (input.credential.revoked) errors.push("credential_revoked");
  if (input.credential.partnerId !== input.expectedPartnerId) errors.push("credential_wrong_partner");

  const env = partnerKeyEnvironment(input.credential.keyPrefix);
  if (!env || env !== input.expectedEnvironment) errors.push("credential_wrong_environment");

  if (input.expectedApplicationId && input.credential.launchpadApplicationId
    && input.credential.launchpadApplicationId !== input.expectedApplicationId) {
    errors.push("credential_wrong_application");
  }

  if (input.applicationStatus && input.applicationStatus !== "active") {
    errors.push("credential_inactive_app");
  }

  if (env === "production" && input.productionAccessApproved === false) {
    errors.push("live_credential_not_reviewed");
  }

  return errors.length === 0 ? { ok: true } : { ok: false, errors: Array.from(new Set(errors)) };
}

export function clientLiveCredentialCreationRejected(body: Record<string, unknown>): boolean {
  return [
    "issue_production_key",
    "production_api_key",
    "production_key",
    "activate_production",
    "environment",
    "abx_live",
  ].some((key) => Object.prototype.hasOwnProperty.call(body, key));
}

export function holderFlowExposesPartnerSecret(payload: unknown): boolean {
  const blob = JSON.stringify(payload).toLowerCase();
  return /abx_(live|test)_[a-z0-9_-]{12,}/.test(blob);
}
