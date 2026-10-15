// FILE: lib/passport/reusableCredential/sovereignIssuance.ts
// Build #567: issue issuer-signed reusable credentials only after finalized sovereign IDV.

import { createHash } from "crypto";
import type { PoolClient } from "pg";
import type { CredentialClaimRecord } from "@/lib/credentials/claimSchema";
import { CLAIM_ISSUERS } from "@/lib/credentials/claimSchema";
import { portableRevocationStatusId } from "@/lib/protocol/portableRevocation/statusId";
import {
  PASSPORT_REUSABLE_CREDENTIAL_SCHEMA_VERSION,
  type PassportCredentialClaimAssertion,
  type PassportReusableCredentialPayload,
  type SignedPassportReusableCredential,
} from "./contract";
import { loadPassportCredentialIssuerRegistry, resolvePassportCredentialIssuerTrust } from "./credentialIssuerRegistry";
import { loadPassportCredentialSigningKey } from "./passportCredentialSigning";
import { credentialPayloadBytesForAudit, signPassportReusableCredential } from "./sign";
import { isPassportReusableCredentialStorageEnabled } from "./storageGate";

export type SovereignReusableIssuanceContext = {
  subjectKey: string;
  credentialJti: string;
  claims: Omit<CredentialClaimRecord, "id" | "status">[];
  assuranceLevel: "L2" | "L3" | "L4";
  idvMethod: "authorized_issuer" | "manual_review";
  evidenceReferenceHash: string;
  expiresAtIso: string;
  issuedAtIso: string;
  eventSource: string;
  captureSessionId?: string | null;
};

export type SovereignReusableIssuanceOutcome =
  | { ok: true; credential: SignedPassportReusableCredential; credentialId: string; alreadyIssued?: boolean }
  | { ok: false; code: SovereignReusableIssuanceFailure };

export type SovereignReusableIssuanceFailure =
  | "storage_disabled"
  | "issuer_registry_missing"
  | "signing_key_missing"
  | "approval_not_final"
  | "no_eligibility_claims"
  | "possession_key_missing"
  | "issuer_untrusted"
  | "signing_key_mismatch";

function credentialIdForJti(jti: string): string {
  const digest = createHash("sha256").update(jti, "utf8").digest("hex").slice(0, 24);
  return `pc_${digest}`;
}

function possessionRef(subjectKey: string, jti: string): string {
  return createHash("sha256").update(`possession-ref:${subjectKey}:${jti}`, "utf8").digest("hex").slice(0, 32);
}

function mapClaimsToAssertions(
  claims: Omit<CredentialClaimRecord, "id" | "status">[],
  claimIdsByType: Map<string, string>,
): PassportCredentialClaimAssertion[] {
  const policyClaims = claims.filter((c) => c.claim_type === "product_eligibility");
  return policyClaims.map((claim) => {
    const outcome =
      typeof claim.claim_value?.outcome === "string"
        ? claim.claim_value.outcome
        : String(claim.claim_value?.outcome ?? "");
    return {
      claim_id: claimIdsByType.get(claim.claim_type) ?? createHash("sha256").update(`${claim.claim_type}:${claim.credential_jti}`, "utf8").digest("hex").slice(0, 16),
      claim_type: claim.claim_type,
      authenticated_outcome: outcome,
      authentication_method: "issuer_signed_assertion" as const,
      claim_evidence_ref: claim.evidence_reference ?? "",
      issuer_id: claim.issuer_id,
      assurance_level: (claim.assurance_level ?? "L2") as PassportCredentialClaimAssertion["assurance_level"],
      issued_at: claim.issued_at,
      expires_at: claim.expires_at,
      status: "active" as const,
    };
  });
}

export function buildSovereignPassportReusableCredentialPayload(input: {
  subjectKey: string;
  credentialJti: string;
  claims: Omit<CredentialClaimRecord, "id" | "status">[];
  claimIdsByType: Map<string, string>;
  assuranceLevel: "L2" | "L3" | "L4";
  idvMethod: "authorized_issuer" | "manual_review";
  evidenceReferenceHash: string;
  holderPossessionPublicKey: string;
  issuedAtIso: string;
  expiresAtIso: string;
  issuerId: string;
  signingKeyId: string;
  revocationIssuerId: string;
}): PassportReusableCredentialPayload {
  const credentialId = credentialIdForJti(input.credentialJti);
  const assertions = mapClaimsToAssertions(input.claims, input.claimIdsByType);
  return {
    credential_id: credentialId,
    schema_version: PASSPORT_REUSABLE_CREDENTIAL_SCHEMA_VERSION,
    issuer_id: input.issuerId,
    signing_key_id: input.signingKeyId,
    holder_subject_id: input.subjectKey,
    holder_possession_public_key: input.holderPossessionPublicKey,
    holder_possession_ref: possessionRef(input.subjectKey, input.credentialJti),
    assurance_level: input.assuranceLevel,
    provenance: {
      idv_method: input.idvMethod,
      evidence_reference_hash: input.evidenceReferenceHash,
      wallet_ownership_not_sufficient: true,
    },
    asserted_claims: assertions,
    issued_at: input.issuedAtIso,
    expires_at: input.expiresAtIso,
    revocation_status_id: portableRevocationStatusId(credentialId, input.revocationIssuerId),
    custody_note: "credential_export_not_account_recovery",
  };
}

export function prepareSovereignReusableCredentialIssuance(
  ctx: SovereignReusableIssuanceContext,
  options?: {
    holderPossessionPublicKey?: string | null;
    claimIdsByType?: Map<string, string>;
    env?: Record<string, string | undefined>;
  },
): SovereignReusableIssuanceOutcome {
  if (!isPassportReusableCredentialStorageEnabled(options?.env)) {
    return { ok: false, code: "storage_disabled" };
  }
  const eligibilityClaims = ctx.claims.filter((c) => c.claim_type === "product_eligibility");
  if (!eligibilityClaims.length) {
    return { ok: false, code: "no_eligibility_claims" };
  }
  const pubKey = options?.holderPossessionPublicKey?.trim();
  if (!pubKey) {
    return { ok: false, code: "possession_key_missing" };
  }
  const signingKey = loadPassportCredentialSigningKey();
  if (!signingKey) {
    return { ok: false, code: "signing_key_missing" };
  }
  const issuerId = CLAIM_ISSUERS.abraxas;
  const trust = resolvePassportCredentialIssuerTrust({
    issuerId,
    signingKeyId: signingKey.signingKeyId,
    env: options?.env,
  });
  if (!trust.ok) {
    return { ok: false, code: trust.code === "issuer_registry_missing" ? "issuer_registry_missing" : trust.code === "signing_key_mismatch" ? "signing_key_mismatch" : "issuer_untrusted" };
  }
  const evidenceHash = createHash("sha256").update(ctx.evidenceReferenceHash, "utf8").digest("hex");
  const payload = buildSovereignPassportReusableCredentialPayload({
    subjectKey: ctx.subjectKey,
    credentialJti: ctx.credentialJti,
    claims: ctx.claims,
    claimIdsByType: options?.claimIdsByType ?? new Map(),
    assuranceLevel: ctx.assuranceLevel,
    idvMethod: ctx.idvMethod,
    evidenceReferenceHash: evidenceHash,
    holderPossessionPublicKey: pubKey,
    issuedAtIso: ctx.issuedAtIso,
    expiresAtIso: ctx.expiresAtIso,
    issuerId,
    signingKeyId: signingKey.signingKeyId,
    revocationIssuerId: trust.entry.revocation_issuer_id,
  });
  const normalizedPayload = JSON.parse(
    credentialPayloadBytesForAudit(payload),
  ) as PassportReusableCredentialPayload;
  const signed = signPassportReusableCredential(normalizedPayload, signingKey);
  return { ok: true, credential: signed, credentialId: normalizedPayload.credential_id };
}

export async function loadClaimIdsForJtiOnClient(
  client: PoolClient,
  subjectKey: string,
  jti: string,
): Promise<Map<string, string>> {
  const result = await client.query<{ id: string; claim_type: string }>(
    `select id, claim_type from public.credential_claims
     where subject_id = $1 and credential_jti = $2 and status = 'active'`,
    [subjectKey, jti],
  );
  const map = new Map<string, string>();
  for (const row of result.rows) {
    map.set(row.claim_type, row.id);
  }
  return map;
}

export function idvMethodFromLivenessProvider(provider: string | null | undefined): "authorized_issuer" | "manual_review" {
  if (provider === "manual_review") return "manual_review";
  return "authorized_issuer";
}

export function assuranceFromIssuance(input: {
  assuranceLevel?: "L2" | "L3" | null;
  livenessProvider?: string | null;
}): "L2" | "L3" | "L4" {
  if (input.assuranceLevel === "L3") return "L3";
  if (input.livenessProvider === "veriff") return "L3";
  return "L2";
}
