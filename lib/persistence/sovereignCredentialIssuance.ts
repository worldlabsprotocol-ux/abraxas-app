// FILE: lib/persistence/sovereignCredentialIssuance.ts
import "server-only";

import { createHash } from "crypto";
import type { PoolClient } from "pg";
import type { CredentialClaimRecord } from "@/lib/credentials/claimSchema";
import { identityVerificationUpsertKeys } from "@/lib/idv/holderIdentityRef";
import { upsertClaimsDirect, ClaimsDirectPersistError } from "./claimsDirectStore";
import { withAbraxasPgTransaction } from "./pgPool";

export class SovereignIssuanceError extends Error {
  constructor(
    readonly code:
      | "credential_already_active"
      | "claims_required"
      | "claims_persist_failed"
      | "verification_persist_failed"
      | "credential_persist_failed"
      | "issuance_audit_failed",
    message?: string,
  ) {
    super(message ?? code);
    this.name = "SovereignIssuanceError";
  }
}

function issuanceLockKey(subjectId: string): { classId: number; objectId: number } {
  const digest = createHash("sha256").update(`abx_issuance:${subjectId}`, "utf8").digest();
  return { classId: 554002, objectId: digest.readInt32BE(0) };
}

export type SovereignCredentialCommitInput = {
  subjectKey: string;
  jti: string;
  credentialJwt: string;
  issuer: string;
  jurisdiction: string;
  documentType: string;
  verificationPatch: Record<string, unknown>;
  eventSource: string;
  captureSessionId?: string | null;
  expirationDateIso: string;
  claims: Omit<CredentialClaimRecord, "id" | "status">[];
};

export async function commitSovereignCredentialIssuanceDirect(
  input: SovereignCredentialCommitInput,
): Promise<{ ok: true; claimCount: number } | { ok: false; code: SovereignIssuanceError["code"] }> {
  if (!input.claims.length) {
    return { ok: false, code: "claims_required" };
  }

  try {
    return await withAbraxasPgTransaction(async (client: PoolClient) => {
      const { classId, objectId } = issuanceLockKey(input.subjectKey);
      await client.query(`select pg_advisory_xact_lock($1::int, $2::int)`, [classId, objectId]);

      const keys = identityVerificationUpsertKeys(input.subjectKey, { includeHolderSubjectColumn: true });
      const existing = await client.query<{ credential_jti: string | null; credential_status: string | null; status: string | null; identity_verification_status: string | null }>(
        `select credential_jti, credential_status, status, identity_verification_status
         from public.identity_verifications
         where wallet_address = $1 or holder_subject_id = $1
         limit 1
         for update`,
        [keys.wallet_address],
      );
      const row = existing.rows[0];
      if (
        row?.credential_jti
        && row.credential_jti !== input.jti
        && (row.credential_status === "active"
          || row.status === "approved"
          || row.identity_verification_status === "approved")
      ) {
        await client.query(
          `insert into public.sovereign_credential_issuance_audit
           (holder_subject_id, credential_jti, capture_session_id, source, claim_count, outcome, detail)
           values ($1,$2,$3,$4,$5,'rejected_duplicate',$6)`,
          [
            keys.holder_subject_id ?? keys.wallet_address,
            input.jti,
            input.captureSessionId ?? null,
            input.eventSource,
            input.claims.length,
            JSON.stringify({ existing_jti: row.credential_jti }),
          ],
        );
        return { ok: false as const, code: "credential_already_active" as const };
      }

      const now = new Date().toISOString();
      const allowed = new Set([
        "wallet_address",
        "sui_address",
        "holder_subject_id",
        "user_email",
        "status",
        "identity_verification_status",
        "credential_status",
        "document_type",
        "document_country",
        "document_state",
        "document_verified",
        "liveness_passed",
        "liveness_provider",
        "credential_jti",
        "veriff_session_id",
        "veriff_decision_id",
        "last_verified_at",
        "credential_issued_at",
        "error_message",
        "updated_at",
      ]);
      const verificationEntries = Object.fromEntries(
        Object.entries({
          ...keys,
          updated_at: now,
          ...input.verificationPatch,
        }).filter(([k, v]) => allowed.has(k) && v !== undefined),
      );
      const vCols = Object.keys(verificationEntries);
      const vVals = Object.values(verificationEntries);
      const vResult = await client.query(
        `insert into public.identity_verifications (${vCols.join(", ")})
         values (${vVals.map((_, i) => `$${i + 1}`).join(", ")})
         on conflict (wallet_address) do update set ${vCols.filter((c) => c !== "wallet_address").map((c) => `${c} = excluded.${c}`).join(", ")}`,
        vVals,
      );
      if ((vResult.rowCount ?? 0) < 1) {
        throw new SovereignIssuanceError("verification_persist_failed");
      }

      const credResult = await client.query(
        `insert into public.abraxas_credentials (
          jti, holder_wallet, issuer, jurisdiction, document_type, verification_level,
          world_id_verified, issuance_date, expiration_date, credential_jwt
        ) values ($1,$2,$3,$4,$5,'standard',false,$6,$7,$8)
        on conflict (jti) do update set credential_jwt = excluded.credential_jwt, expiration_date = excluded.expiration_date`,
        [
          input.jti,
          input.subjectKey,
          input.issuer,
          input.jurisdiction,
          input.documentType,
          input.verificationPatch.credential_issued_at ?? now,
          input.expirationDateIso,
          input.credentialJwt,
        ],
      );
      if ((credResult.rowCount ?? 0) < 1) {
        throw new SovereignIssuanceError("credential_persist_failed");
      }

      await upsertClaimsDirect(input.claims, client);

      await client.query(
        `insert into public.identity_verification_events
         (sui_address, holder_subject_id, to_status, source, veriff_session_id, created_at)
         values ($1,$2,$3,$4,$5,$6)`,
        [
          input.subjectKey,
          keys.holder_subject_id,
          input.verificationPatch.identity_verification_status ?? "approved",
          input.eventSource,
          input.verificationPatch.veriff_session_id ?? null,
          now,
        ],
      );

      await client.query(
        `insert into public.sovereign_credential_issuance_audit
         (holder_subject_id, credential_jti, capture_session_id, source, claim_count, outcome)
         values ($1,$2,$3,$4,$5,'committed')`,
        [
          keys.holder_subject_id ?? keys.wallet_address,
          input.jti,
          input.captureSessionId ?? null,
          input.eventSource,
          input.claims.length,
        ],
      );

      return { ok: true as const, claimCount: input.claims.length };
    });
  } catch (error) {
    if (error instanceof ClaimsDirectPersistError) {
      return { ok: false, code: "claims_persist_failed" };
    }
    if (error instanceof SovereignIssuanceError) {
      return { ok: false, code: error.code };
    }
    return { ok: false, code: "verification_persist_failed" };
  }
}
