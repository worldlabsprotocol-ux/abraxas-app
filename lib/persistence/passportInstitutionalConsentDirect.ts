// FILE: lib/persistence/passportInstitutionalConsentDirect.ts

import "server-only";

import { randomBytes } from "crypto";
import { queryAbraxasPg } from "./pgPool";

const CONSENT_TTL_MS = 15 * 60 * 1000;

export type InsertInstitutionalConsentResult =
  | { ok: true; consentId: string; expiresAt: string; disclosureHash: string }
  | { ok: false; code: "persistence_unavailable" };

export async function insertInstitutionalPresentationConsentDirect(input: {
  holderSubjectId: string;
  credentialId: string;
  partnerId: string;
  policyId: string;
  policyVersion: number;
  disclosureHash: string;
}): Promise<InsertInstitutionalConsentResult> {
  const consentId = `pic_${randomBytes(12).toString("base64url")}`;
  const expiresAt = new Date(Date.now() + CONSENT_TTL_MS).toISOString();
  try {
    await queryAbraxasPg(
      `insert into public.passport_institutional_presentation_consents (
         consent_id, holder_subject_id, credential_id, partner_id, policy_id,
         policy_version, disclosure_hash, expires_at
       ) values ($1, $2, $3, $4, $5, $6, $7, $8::timestamptz)`,
      [
        consentId,
        input.holderSubjectId,
        input.credentialId,
        input.partnerId,
        input.policyId,
        input.policyVersion,
        input.disclosureHash,
        expiresAt,
      ],
    );
    return { ok: true, consentId, expiresAt, disclosureHash: input.disclosureHash };
  } catch {
    return { ok: false, code: "persistence_unavailable" };
  }
}

export type ConsumeInstitutionalConsentResult =
  | { ok: true }
  | {
      ok: false;
      code:
        | "consent_not_found"
        | "consent_expired"
        | "consent_already_used"
        | "consent_binding_mismatch"
        | "persistence_unavailable";
    };

export async function consumeInstitutionalPresentationConsentDirect(input: {
  consentId: string;
  holderSubjectId: string;
  credentialId: string;
  partnerId: string;
  policyId: string;
  policyVersion: number;
  disclosureHash: string;
  at?: Date;
}): Promise<ConsumeInstitutionalConsentResult> {
  const at = input.at ?? new Date();
  try {
    const { rows } = await queryAbraxasPg<{
      holder_subject_id: string;
      credential_id: string;
      partner_id: string;
      policy_id: string;
      policy_version: number;
      disclosure_hash: string;
      expires_at: string;
      consumed_at: string | null;
    }>(
      `select holder_subject_id, credential_id, partner_id, policy_id, policy_version,
              disclosure_hash, expires_at, consumed_at
       from public.passport_institutional_presentation_consents
       where consent_id = $1
       limit 1`,
      [input.consentId],
    );
    const row = rows[0];
    if (!row) return { ok: false, code: "consent_not_found" };
    if (row.consumed_at) return { ok: false, code: "consent_already_used" };
    if (Date.parse(row.expires_at) < at.getTime()) return { ok: false, code: "consent_expired" };
    if (
      row.holder_subject_id !== input.holderSubjectId
      || row.credential_id !== input.credentialId
      || row.partner_id !== input.partnerId
      || row.policy_id !== input.policyId
      || row.policy_version !== input.policyVersion
      || row.disclosure_hash !== input.disclosureHash
    ) {
      return { ok: false, code: "consent_binding_mismatch" };
    }
    const updated = await queryAbraxasPg<{ consent_id: string }>(
      `update public.passport_institutional_presentation_consents
       set consumed_at = $2::timestamptz
       where consent_id = $1 and consumed_at is null
       returning consent_id`,
      [input.consentId, at.toISOString()],
    );
    if (!updated.rows[0]) return { ok: false, code: "consent_already_used" };
    return { ok: true };
  } catch {
    return { ok: false, code: "persistence_unavailable" };
  }
}
