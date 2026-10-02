// FILE: lib/identity/providerIngestion/normalize.ts
// Normalize authorized provider assertions into credential claims.

import type { AssuranceLevel, ClaimType, CredentialClaimRecord } from "@/lib/credentials/claimSchema";
import type { ProviderAuthorization } from "./providerConfig";
import { assertClaimAuthorized, clampAssurance } from "./providerConfig";
import type { NormalizedProviderEvent, ProviderAuthorizedAssertion } from "./contract";

export type NormalizeResult =
  | { ok: true; claims: Omit<CredentialClaimRecord, "id" | "status">[] }
  | { ok: false; code: string; detail?: string };

function normalizeAssertion(
  assertion: ProviderAuthorizedAssertion,
  auth: ProviderAuthorization,
  event: NormalizedProviderEvent,
  claimsSubjectKey: string,
): { ok: true; claim: Omit<CredentialClaimRecord, "id" | "status"> } | { ok: false; code: string } {
  if (!assertClaimAuthorized(auth, assertion.claim_type)) {
    return { ok: false, code: `unauthorized_claim_type:${assertion.claim_type}` };
  }

  const assurance = clampAssurance(auth, assertion.assurance_level ?? null);
  if (assertion.assurance_level && !assurance) {
    return { ok: false, code: `assurance_ceiling_exceeded:${assertion.claim_type}` };
  }

  const issuedAt = event.issued_at;
  const expiresAt = assertion.expires_at ?? event.expires_at ?? null;

  return {
    ok: true,
    claim: {
      subject_id: claimsSubjectKey,
      credential_jti: null,
      claim_type: assertion.claim_type as ClaimType,
      claim_value: sanitizeClaimValue(assertion.claim_value),
      issuer_id: auth.providerId,
      assurance_level: assurance as AssuranceLevel | null,
      issued_at: issuedAt,
      expires_at: expiresAt,
      revocation_reference: null,
      evidence_reference: event.evidence_reference ?? event.provider_event_id,
      jurisdiction: assertion.jurisdiction ?? null,
      policy_scope: null,
    },
  };
}

function sanitizeClaimValue(value: Record<string, unknown>): Record<string, unknown> {
  const forbidden = [
    "legal_name", "date_of_birth", "passport_number", "document_image_url",
    "selfie_url", "home_address", "provider_case_notes", "provider_subject_ref",
    "address_line", "provider_internal_case_id", "risk_notes", "provider_payload",
  ];
  const clean: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value)) {
    if (forbidden.includes(k)) continue;
    if (typeof v === "string" && v.startsWith("http") && (k.includes("image") || k.includes("url"))) {
      continue;
    }
    clean[k] = v;
  }
  return clean;
}

export function normalizeProviderAssertions(input: {
  event: NormalizedProviderEvent;
  auth: ProviderAuthorization;
  claimsSubjectKey: string;
}): NormalizeResult {
  const claims: Omit<CredentialClaimRecord, "id" | "status">[] = [];

  for (const assertion of input.event.authorized_assertions) {
    const result = normalizeAssertion(assertion, input.auth, input.event, input.claimsSubjectKey);
    if (!result.ok) {
      return { ok: false, code: result.code };
    }
    claims.push(result.claim);
  }

  return { ok: true, claims };
}
