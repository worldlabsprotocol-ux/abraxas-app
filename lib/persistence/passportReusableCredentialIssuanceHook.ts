// FILE: lib/persistence/passportReusableCredentialIssuanceHook.ts
import "server-only";

import { createHash } from "crypto";
import type { PoolClient } from "pg";
import {
  assuranceFromIssuance,
  idvMethodFromLivenessProvider,
  loadClaimIdsForJtiOnClient,
  prepareSovereignReusableCredentialIssuance,
} from "@/lib/passport/reusableCredential/sovereignIssuance";
import { isPassportReusableCredentialStorageEnabled } from "@/lib/passport/reusableCredential/storageGate";
import {
  getPassportHolderPossessionPublicKeyDirect,
  getPassportReusableCredentialByJtiOnClient,
  persistPassportReusableCredentialOnClient,
  recordPassportReusableIssuanceAuditOnClient,
} from "./passportReusableCredentialDirectStore";

function coerceIsoTimestamp(value: unknown, fallback: string): string {
  if (typeof value === "string" && value.trim()) return value;
  if (value instanceof Date) return value.toISOString();
  return fallback;
}

type VerificationRow = {
  credential_jti: string | null;
  status: string | null;
  identity_verification_status: string | null;
  credential_status: string | null;
  liveness_provider: string | null;
  credential_issued_at: string | null;
};

export async function tryIssuePassportReusableCredentialOnClient(
  client: PoolClient,
  input: { subjectKey: string; eventSource: string },
): Promise<{ ok: true; credentialId: string; alreadyIssued?: boolean } | { ok: false; code: string }> {
  if (!isPassportReusableCredentialStorageEnabled()) {
    return { ok: false, code: "storage_disabled" };
  }

  const vRes = await client.query<VerificationRow>(
    `select credential_jti, status, identity_verification_status, credential_status, liveness_provider, credential_issued_at
     from public.identity_verifications
     where wallet_address = $1 or holder_subject_id = $1
     limit 1`,
    [input.subjectKey],
  );
  const v = vRes.rows[0];
  if (!v?.credential_jti) {
    await recordPassportReusableIssuanceAuditOnClient(client, {
      holderSubjectId: input.subjectKey,
      linkedCredentialJti: "unknown",
      source: input.eventSource,
      outcome: "rejected_no_credential_jti",
    });
    return { ok: false, code: "approval_not_final" };
  }
  const approved =
    v.status === "approved"
    || v.identity_verification_status === "approved"
    || v.credential_status === "active";
  if (!approved) {
    await recordPassportReusableIssuanceAuditOnClient(client, {
      holderSubjectId: input.subjectKey,
      linkedCredentialJti: v.credential_jti,
      source: input.eventSource,
      outcome: "rejected_not_approved",
    });
    return { ok: false, code: "approval_not_final" };
  }

  const existing = await getPassportReusableCredentialByJtiOnClient(client, v.credential_jti);
  if (existing) {
    return { ok: true, credentialId: existing.payload.credential_id, alreadyIssued: true };
  }

  const possessionKey = await getPassportHolderPossessionPublicKeyDirect(input.subjectKey, client);
  if (!possessionKey) {
    await recordPassportReusableIssuanceAuditOnClient(client, {
      holderSubjectId: input.subjectKey,
      linkedCredentialJti: v.credential_jti,
      source: input.eventSource,
      outcome: "deferred_possession_key",
    });
    return { ok: false, code: "possession_key_missing" };
  }

  const claimsRes = await client.query<{
    subject_id: string;
    credential_jti: string | null;
    claim_type: string;
    claim_value: Record<string, unknown>;
    issuer_id: string;
    assurance_level: string | null;
    issued_at: string;
    expires_at: string | null;
    evidence_reference: string | null;
    jurisdiction: string | null;
    policy_scope: string | null;
  }>(
    `select subject_id, credential_jti, claim_type, claim_value, issuer_id, assurance_level,
            issued_at, expires_at, evidence_reference, jurisdiction, policy_scope
     from public.credential_claims
     where subject_id = $1 and credential_jti = $2 and status = 'active'`,
    [input.subjectKey, v.credential_jti],
  );
  if (!claimsRes.rows.length) {
    await recordPassportReusableIssuanceAuditOnClient(client, {
      holderSubjectId: input.subjectKey,
      linkedCredentialJti: v.credential_jti,
      source: input.eventSource,
      outcome: "rejected_no_claims",
    });
    return { ok: false, code: "no_eligibility_claims" };
  }

  const claimIds = await loadClaimIdsForJtiOnClient(client, input.subjectKey, v.credential_jti);
  const productClaim = claimsRes.rows.find((c) => c.claim_type === "product_eligibility");
  if (!productClaim) {
    await recordPassportReusableIssuanceAuditOnClient(client, {
      holderSubjectId: input.subjectKey,
      linkedCredentialJti: v.credential_jti,
      source: input.eventSource,
      outcome: "rejected_no_product_eligibility",
    });
    return { ok: false, code: "no_eligibility_claims" };
  }

  const credRes = await client.query<{ expiration_date: string }>(
    `select expiration_date from public.abraxas_credentials where jti = $1`,
    [v.credential_jti],
  );
  const defaultExpires = new Date(Date.now() + 365 * 86400000).toISOString();
  const expiresAtIso = coerceIsoTimestamp(
    credRes.rows[0]?.expiration_date ?? productClaim.expires_at,
    defaultExpires,
  );
  const issuedAtIso = coerceIsoTimestamp(
    v.credential_issued_at ?? productClaim.issued_at,
    new Date().toISOString(),
  );
  const evidenceRef = productClaim.evidence_reference ?? `sovereign:${v.credential_jti}`;
  const evidenceReferenceHash = createHash("sha256").update(evidenceRef, "utf8").digest("hex");

  const prepared = prepareSovereignReusableCredentialIssuance(
    {
      subjectKey: input.subjectKey,
      credentialJti: v.credential_jti,
      claims: claimsRes.rows.map((row) => ({
        subject_id: row.subject_id,
        credential_jti: row.credential_jti,
        claim_type: row.claim_type as import("@/lib/credentials/claimSchema").ClaimType,
        claim_value: row.claim_value,
        issuer_id: row.issuer_id,
        assurance_level: row.assurance_level as import("@/lib/credentials/claimSchema").AssuranceLevel | null,
        issued_at: coerceIsoTimestamp(row.issued_at, issuedAtIso),
        expires_at: row.expires_at ? coerceIsoTimestamp(row.expires_at, expiresAtIso) : expiresAtIso,
        revocation_reference: null,
        evidence_reference: row.evidence_reference,
        jurisdiction: row.jurisdiction,
        policy_scope: row.policy_scope,
      })),
      assuranceLevel: assuranceFromIssuance({ livenessProvider: v.liveness_provider }),
      idvMethod: idvMethodFromLivenessProvider(v.liveness_provider),
      evidenceReferenceHash: evidenceRef,
      expiresAtIso,
      issuedAtIso,
      eventSource: input.eventSource,
    },
    { holderPossessionPublicKey: possessionKey, claimIdsByType: claimIds },
  );

  if (!prepared.ok) {
    await recordPassportReusableIssuanceAuditOnClient(client, {
      holderSubjectId: input.subjectKey,
      linkedCredentialJti: v.credential_jti,
      source: input.eventSource,
      outcome: `rejected_${prepared.code}`,
    });
    return { ok: false, code: prepared.code };
  }

  const sandboxLabeled = process.env.NODE_ENV !== "production";
  const persist = await persistPassportReusableCredentialOnClient(client, {
    credential: prepared.credential,
    linkedCredentialJti: v.credential_jti,
    sandboxLabeled,
  });
  if ("duplicate" in persist && persist.duplicate) {
    const again = await getPassportReusableCredentialByJtiOnClient(client, v.credential_jti);
    if (again) {
      return { ok: true, credentialId: again.payload.credential_id, alreadyIssued: true };
    }
  }

  await recordPassportReusableIssuanceAuditOnClient(client, {
    holderSubjectId: input.subjectKey,
    linkedCredentialJti: v.credential_jti,
    credentialId: prepared.credentialId,
    source: input.eventSource,
    outcome: "committed",
    detail: { evidence_reference_hash: evidenceReferenceHash },
  });

  return { ok: true, credentialId: prepared.credentialId };
}
