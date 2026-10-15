// FILE: lib/persistence/passportReusableCredentialLifecycleDirect.ts

import "server-only";

import {
  resolveReusableCredentialLifecycle,
  type ReusableCredentialLifecycleSnapshot,
} from "@/lib/passport/reusableCredential/credentialLifecycle";
import { isPassportReusableCredentialStorageEnabled } from "@/lib/passport/reusableCredential/storageGate";
import { queryAbraxasPg } from "./pgPool";

export async function loadReusableCredentialLifecycleForHolderDirect(
  holderSubjectId: string,
): Promise<ReusableCredentialLifecycleSnapshot> {
  const storageEnabled = isPassportReusableCredentialStorageEnabled();

  if (!storageEnabled) {
    return resolveReusableCredentialLifecycle({
      storageEnabled: false,
      possessionKeyRegistered: false,
      verificationRows: [],
      activeIssuerBackedCredentialCount: 0,
      expiredIssuerBackedCredentialCount: 0,
    });
  }

  const [verificationRes, possessionRes, credentialRes, auditRes] = await Promise.all([
    queryAbraxasPg<{
      status: string | null;
      identity_verification_status: string | null;
      credential_status: string | null;
      credential_jti: string | null;
      credential_issued_at: string | null;
      document_verified: boolean | null;
      liveness_passed: boolean | null;
      updated_at: string | null;
    }>(
      `select status, identity_verification_status, credential_status, credential_jti, credential_issued_at,
              document_verified, liveness_passed, updated_at
       from public.identity_verifications
       where holder_subject_id = $1 or wallet_address = $1
       order by updated_at desc nulls last`,
      [holderSubjectId],
    ),
    queryAbraxasPg<{ public_key_b64url: string }>(
      `select public_key_b64url from public.passport_holder_possession_keys where holder_subject_id = $1`,
      [holderSubjectId],
    ),
    queryAbraxasPg<{ active_c: number; expired_c: number }>(
      `select
         count(*) filter (where expires_at > now())::int as active_c,
         count(*) filter (where expires_at <= now())::int as expired_c
       from public.passport_reusable_credentials
       where holder_subject_id = $1 and sandbox_labeled = false`,
      [holderSubjectId],
    ),
    queryAbraxasPg<{ outcome: string }>(
      `select outcome from public.passport_reusable_credential_issuance_audit
       where holder_subject_id = $1
       order by created_at desc
       limit 1`,
      [holderSubjectId],
    ),
  ]);

  const active = credentialRes.rows[0]?.active_c ?? 0;
  const expired = credentialRes.rows[0]?.expired_c ?? 0;
  const lastOutcome = auditRes.rows[0]?.outcome ?? null;
  const deferCode =
    lastOutcome?.startsWith("rejected_") || lastOutcome === "deferred_possession_key"
      ? lastOutcome.replace(/^rejected_/, "").replace("deferred_possession_key", "possession_key_missing")
      : null;

  return resolveReusableCredentialLifecycle({
    storageEnabled: true,
    possessionKeyRegistered: Boolean(possessionRes.rows[0]?.public_key_b64url),
    verificationRows: verificationRes.rows,
    activeIssuerBackedCredentialCount: active,
    expiredIssuerBackedCredentialCount: expired,
    lastIssuanceDeferralCode: deferCode,
  });
}
