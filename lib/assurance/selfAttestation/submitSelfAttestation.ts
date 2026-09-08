// FILE: lib/assurance/selfAttestation/submitSelfAttestation.ts
// Orchestrate tier-1 self-attestation — DOB is transient only.

import { randomBytes } from "crypto";
import { normalizeSuiAddress } from "@mysten/sui/utils";
import { getPolicy } from "@/lib/verification/requestsService";
import { isBrowseAccessPolicy } from "@/lib/policy/selfAttestationGuards";
import { deriveSelfAttestedAgeBand, parseIsoDateUtc } from "./calculateAgeBand";
import {
  generateBrowseReceiptId,
  insertSelfAttestationRecord,
} from "./selfAttestationLedger";
import {
  buildBrowseReceiptPayload,
  signBrowseAccessReceipt,
} from "./browseReceipt";
import { emitSelfAttestationAuditEvent } from "./selfAttestationAudit";
import {
  isBlockedSelfAttestationPurpose,
  normalizeSelfAttestationPurpose,
} from "./purposePolicy";
import type { SelfAttestedAgeBand } from "./constants";

export interface SelfAttestSubmitInput {
  dateOfBirth: string;
  partnerId: string;
  policyId: string;
  purpose: unknown;
  holderRef: string;
}

export type SelfAttestSubmitResult =
  | {
      ok: true;
      age_band: SelfAttestedAgeBand;
      assurance_level: "L0";
      purpose: "browse";
      valid_for_purchase: false;
      expires_at: string;
      browse_receipt?: string;
      browse_receipt_id?: string;
    }
  | { ok: false; code: string; status: number };

export async function submitSelfAttestation(
  input: SelfAttestSubmitInput,
): Promise<SelfAttestSubmitResult> {
  if (isBlockedSelfAttestationPurpose(input.purpose)) {
    emitSelfAttestationAuditEvent({
      event: "self_attest_denied",
      holderRef: input.holderRef,
      partnerId: input.partnerId,
      policyId: input.policyId,
      purpose: String(input.purpose),
      code: "purpose_not_allowed",
    });
    return { ok: false, code: "purpose_not_allowed", status: 400 };
  }

  const purpose = normalizeSelfAttestationPurpose(input.purpose);
  if (!purpose) {
    emitSelfAttestationAuditEvent({
      event: "self_attest_denied",
      holderRef: input.holderRef,
      partnerId: input.partnerId,
      policyId: input.policyId,
      purpose: String(input.purpose ?? ""),
      code: "invalid_purpose",
    });
    return { ok: false, code: "invalid_purpose", status: 400 };
  }

  const policy = await getPolicy(input.policyId);
  if (!policy) {
    return { ok: false, code: "policy_not_found", status: 400 };
  }
  if (policy.partner_id !== input.partnerId) {
    return { ok: false, code: "partner_policy_mismatch", status: 400 };
  }
  if (!isBrowseAccessPolicy(policy.rules_json)) {
    emitSelfAttestationAuditEvent({
      event: "self_attest_denied",
      holderRef: input.holderRef,
      partnerId: input.partnerId,
      policyId: input.policyId,
      purpose,
      code: "policy_not_browse",
    });
    return { ok: false, code: "policy_not_browse", status: 400 };
  }

  const parsed = parseIsoDateUtc(input.dateOfBirth);
  if (!parsed.ok) {
    emitSelfAttestationAuditEvent({
      event: "self_attest_denied",
      holderRef: input.holderRef,
      partnerId: input.partnerId,
      policyId: input.policyId,
      purpose,
      code: parsed.code,
    });
    return { ok: false, code: parsed.code, status: 400 };
  }

  const minimumAge = policy.rules_json.minimum_age ?? 21;
  const ageBand = deriveSelfAttestedAgeBand(parsed.dobUtc, minimumAge);
  const holderRef = normalizeSuiAddress(input.holderRef);
  const nonce = randomBytes(16).toString("base64url");
  const browseReceiptId = ageBand === "over_21" ? generateBrowseReceiptId() : null;

  const inserted = await insertSelfAttestationRecord({
    holderRef,
    partnerId: input.partnerId,
    policyId: input.policyId,
    ageBand,
    purpose,
    browseReceiptId,
  });

  if (!inserted.ok) {
    return { ok: false, code: inserted.code, status: 500 };
  }

  emitSelfAttestationAuditEvent({
    event: "self_attest_submitted",
    holderRef,
    partnerId: input.partnerId,
    policyId: input.policyId,
    purpose,
    ageBand,
  });

  if (ageBand === "under_21") {
    return {
      ok: true,
      age_band: ageBand,
      assurance_level: "L0",
      purpose: "browse",
      valid_for_purchase: false,
      expires_at: inserted.row.expires_at,
    };
  }

  let browseReceipt: string | undefined;
  if (browseReceiptId) {
    const payload = buildBrowseReceiptPayload({
      receiptId: browseReceiptId,
      partnerId: input.partnerId,
      policyId: input.policyId,
      ageBand,
      issuedAt: inserted.row.attested_at,
      expiresAt: inserted.row.expires_at,
      nonce,
    });
    const signed = await signBrowseAccessReceipt(payload);
    if (signed) {
      browseReceipt = signed;
      emitSelfAttestationAuditEvent({
        event: "browse_receipt_issued",
        holderRef,
        partnerId: input.partnerId,
        policyId: input.policyId,
        purpose,
        ageBand,
      });
    }
  }

  return {
    ok: true,
    age_band: ageBand,
    assurance_level: "L0",
    purpose: "browse",
    valid_for_purchase: false,
    expires_at: inserted.row.expires_at,
    browse_receipt: browseReceipt,
    browse_receipt_id: browseReceiptId ?? undefined,
  };
}
