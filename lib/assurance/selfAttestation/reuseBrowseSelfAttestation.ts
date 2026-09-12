// FILE: lib/assurance/selfAttestation/reuseBrowseSelfAttestation.ts
// Re-issue browse receipt JWT from an existing unexpired L0 attestation — no DOB re-entry.

import { randomBytes } from "crypto";
import { normalizeSuiAddress } from "@mysten/sui/utils";
import { isAllowedPartnerReturnUrl } from "@/lib/partner/returnUrlAllowlist";
import { getPolicy } from "@/lib/verification/requestsService";
import { isBrowseAccessPolicy } from "@/lib/policy/selfAttestationGuards";
import { getActiveSelfAttestations } from "./selfAttestationLedger";
import {
  buildBrowseReceiptPayload,
  signBrowseAccessReceipt,
} from "./browseReceipt";
import { emitSelfAttestationAuditEvent } from "./selfAttestationAudit";

export interface BrowseReuseInput {
  holderRef: string;
  partnerId: string;
  policyId: string;
  returnUrl: string;
}

export type BrowseReuseResult =
  | {
      ok: true;
      browse_receipt: string;
      browse_receipt_id: string;
      expires_at: string;
      age_band: "over_21";
    }
  | { ok: false; code: string };

export async function reuseBrowseSelfAttestation(
  input: BrowseReuseInput,
): Promise<BrowseReuseResult> {
  if (!await isAllowedPartnerReturnUrl(input.partnerId, input.returnUrl)) {
    return { ok: false, code: "return_url_not_allowed" };
  }

  const policy = await getPolicy(input.policyId);
  if (!policy) return { ok: false, code: "policy_not_found" };
  if (policy.partner_id !== input.partnerId) {
    return { ok: false, code: "partner_policy_mismatch" };
  }
  if (!isBrowseAccessPolicy(policy.rules_json)) {
    return { ok: false, code: "policy_not_browse" };
  }

  const holderRef = normalizeSuiAddress(input.holderRef);
  const rows = await getActiveSelfAttestations({
    holderRef,
    partnerId: input.partnerId,
    policyId: input.policyId,
    purpose: "browse",
  });

  const active = rows.find(
    (row) => row.age_band === "over_21" && row.browse_receipt_id,
  );
  if (!active?.browse_receipt_id) {
    return { ok: false, code: "no_reusable_browse_proof" };
  }

  const nonce = randomBytes(16).toString("base64url");
  const payload = buildBrowseReceiptPayload({
    receiptId: active.browse_receipt_id,
    partnerId: input.partnerId,
    policyId: input.policyId,
    ageBand: "over_21",
    issuedAt: active.attested_at,
    expiresAt: active.expires_at,
    nonce,
  });
  const browseReceipt = await signBrowseAccessReceipt(payload);
  if (!browseReceipt) {
    return { ok: false, code: "receipt_signing_failed" };
  }

  emitSelfAttestationAuditEvent({
    event: "browse_receipt_issued",
    holderRef,
    partnerId: input.partnerId,
    policyId: input.policyId,
    purpose: "browse",
    ageBand: "over_21",
  });

  return {
    ok: true,
    browse_receipt: browseReceipt,
    browse_receipt_id: active.browse_receipt_id,
    expires_at: active.expires_at,
    age_band: "over_21",
  };
}

export function buildBrowseReturnUrl(
  returnUrl: string,
  input: {
    browseReceipt: string;
    browseReceiptId: string;
    policyId: string;
  },
): string | null {
  try {
    const target = new URL(returnUrl);
    target.searchParams.set("browse_receipt", input.browseReceipt);
    target.searchParams.set("browse_receipt_id", input.browseReceiptId);
    target.searchParams.set("purpose", "browse");
    target.searchParams.set("policy_id", input.policyId);
    return target.toString();
  } catch {
    return null;
  }
}
