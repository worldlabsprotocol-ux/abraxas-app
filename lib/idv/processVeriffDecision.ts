// FILE: lib/idv/processVeriffDecision.ts
// Shared Veriff decision handling (webhook + polling fallback).

import { normalizeSuiAddress } from "@mysten/sui/utils";
import { revokeSubjectClaims } from "@/lib/credentials/claimsService";
import { issueIdentityCredential } from "./issueIdentityCredential";
import { idvSupabase, transitionIdentityVerification } from "./identityVerificationDb";
import { mapVeriffToIdentityStatus } from "./identityVerificationStates";
import type { VeriffDecisionInput } from "./types";

export type { VeriffDecisionInput };

export interface ProcessDecisionResult {
  ok: boolean;
  status: "approved" | "pending" | "declined" | "ignored";
  holder?: string;
  jti?: string;
  message?: string;
}

function parseHolder(vendorData?: string): string | null {
  const suiMatch = vendorData?.match(/^sui:(.+)$/);
  const legacyMatch = vendorData?.match(/^wallet:(.+)$/);
  return suiMatch?.[1] ?? legacyMatch?.[1] ?? null;
}

export async function processVeriffDecision(
  v: VeriffDecisionInput,
  holderOverride?: string,
): Promise<ProcessDecisionResult> {
  const holder = parseHolder(v.vendorData) ?? holderOverride ?? null;
  if (!holder) {
    return { ok: true, status: "ignored", message: "No holder in vendorData" };
  }

  const normalized = normalizeSuiAddress(holder);
  const sb = idvSupabase();

  if (v.status === "declined" || v.status === "resubmission_requested") {
    const idvStatus = mapVeriffToIdentityStatus(v.status);
    await transitionIdentityVerification(
      normalized,
      {
        status: v.status === "declined" ? "revoked" : "pending",
        identity_verification_status: idvStatus,
        credential_status: v.status === "declined" ? "revoked" : "not_issued",
        veriff_session_id: v.id,
      },
      "veriff_webhook",
    );

    if (v.status === "declined" && sb) {
      const { data: existing } = await sb
        .from("abraxas_credentials")
        .select("jti")
        .or(`sui_address.eq.${normalized},holder_wallet.eq.${normalized}`)
        .is("revoked_at", null)
        .maybeSingle();
      await revokeSubjectClaims(normalized, `veriff_declined:${v.id}`, existing?.jti);
    }
    return { ok: true, status: v.status === "declined" ? "declined" : "pending", holder: normalized };
  }

  if (v.status === "submitted" || v.status === "review") {
    await transitionIdentityVerification(
      normalized,
      {
        identity_verification_status: "submitted",
        veriff_session_id: v.id,
      },
      "veriff_webhook",
    );
    return { ok: true, status: "pending", holder: normalized };
  }

  if (v.status !== "approved") {
    return { ok: true, status: "ignored", holder: normalized };
  }

  const issued = await issueIdentityCredential(normalized, v);
  if (!issued.ok) {
    await transitionIdentityVerification(
      normalized,
      {
        identity_verification_status: "error",
        error_message: issued.message ?? "Credential issuance failed",
        veriff_session_id: v.id,
      },
      "issue_error",
    );
    return { ok: false, status: "ignored", holder: normalized, message: issued.message };
  }

  return {
    ok: true,
    status: "approved",
    holder: normalized,
    jti: issued.jti,
    message: issued.alreadyIssued ? "Already issued" : undefined,
  };
}
