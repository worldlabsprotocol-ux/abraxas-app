// FILE: lib/developers/verifyBuilderEnforcementReceipt.server.ts
import "server-only";

import { toIndependentVerifierRecord } from "@/lib/decisionReceipts/independentVerifierBridge";
import { getReceiptById } from "@/lib/decisionReceipts/service";
import { buildPortableVerificationBundle } from "@/lib/partner/portableIndependentVerification";
import { verifyTrustExecutionMaterial } from "@/lib/partner/trustExecution/verifyTrustExecutionMaterial";
import { enforcementFromIndependentVerification } from "@abraxas/independent-verifier";

export type BuilderReceiptPlatformVerification = {
  receipt_id: string;
  ok: boolean;
  unavailable: boolean;
  cryptographically_authentic: boolean;
  currently_acceptable: string;
  enforcement_action: "permit" | "deny" | "indeterminate";
  failure_codes: string[];
};

export async function verifyBuilderEnforcementReceipt(input: {
  receiptId: string;
  partnerId: string;
  policyId: string;
}): Promise<BuilderReceiptPlatformVerification> {
  const record = await getReceiptById(input.receiptId);
  if (!record) {
    return {
      receipt_id: input.receiptId,
      ok: false,
      unavailable: false,
      cryptographically_authentic: false,
      currently_acceptable: "indeterminate",
      enforcement_action: "indeterminate",
      failure_codes: ["receipt_not_found"],
    };
  }

  if (record.partner_id && record.partner_id !== input.partnerId) {
    return {
      receipt_id: input.receiptId,
      ok: false,
      unavailable: false,
      cryptographically_authentic: false,
      currently_acceptable: "indeterminate",
      enforcement_action: "indeterminate",
      failure_codes: ["tenant_mismatch"],
    };
  }

  const built = await buildPortableVerificationBundle({ record });
  if (!built.ok) {
    return {
      receipt_id: input.receiptId,
      ok: false,
      unavailable: true,
      cryptographically_authentic: false,
      currently_acceptable: "indeterminate",
      enforcement_action: "indeterminate",
      failure_codes: built.gaps ?? [built.reason ?? "bundle_unavailable"],
    };
  }

  const bundle = built.bundle;
  const verified = verifyTrustExecutionMaterial({
    material: {
      portable_receipt: toIndependentVerifierRecord(bundle.decision_receipt),
      signed_issuer_authority: bundle.signed_issuer_authority,
      signed_status_statement: bundle.signed_status_statement,
    },
    pinnedTrustAnchor: bundle.bundled_trust_anchor,
    partnerId: input.partnerId,
    policyId: input.policyId,
    environment: record.decision_context === "production" ? "production" : "demo",
  });

  const { action } = enforcementFromIndependentVerification(verified);

  return {
    receipt_id: input.receiptId,
    ok: verified.cryptographically_authentic,
    unavailable: false,
    cryptographically_authentic: verified.cryptographically_authentic,
    currently_acceptable: verified.currently_acceptable,
    enforcement_action: action,
    failure_codes: verified.failure_codes,
  };
}
