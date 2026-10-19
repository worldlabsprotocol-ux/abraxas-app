// FILE: lib/protocolVerification/evidenceAdapters.ts

import type { EvidenceAdapterResult, EvidencePresentation } from "./types";
import { evaluatePublicReceiptTrust } from "@/lib/decisionReceipts/trustEvaluation";
import type { PartnerFlowPublicReceipt } from "@/lib/partner/verifyPartnerFlowReceipt";
import type { SignedPassportReusableCredential } from "@/lib/passport/reusableCredential/contract";
import type { PortableRevocationSignedArtifact } from "@/lib/protocol/portableRevocation";
import { evaluatePassportCredentialEvidence } from "./evaluatePassportCredentialEvidence";

export async function evaluateEvidencePresentation(input: {
  presentation: EvidencePresentation;
  partnerId: string;
  policyId: string;
  walletSubject: string;
  context?: "sandbox_only" | "production";
}): Promise<EvidenceAdapterResult> {
  if (input.presentation.kind === "unsupported_issuer") {
    return { ok: false, code: "issuer_not_supported", unsupported: true };
  }

  if (input.presentation.kind === "passport_reusable_credential") {
    const evaluated = await evaluatePassportCredentialEvidence({
      credential: input.presentation.credential as SignedPassportReusableCredential,
      portable_revocation_snapshot: input.presentation.portable_revocation_snapshot as PortableRevocationSignedArtifact,
      walletSubject: input.walletSubject,
      policyId: input.policyId,
      context: input.context ?? "sandbox_only",
    });
    if (!evaluated.ok) {
      return {
        ok: false,
        code: evaluated.code,
        unsupported: evaluated.unsupported,
      };
    }
    return {
      ok: true,
      claim_refs: evaluated.materialized_claims.map((claim) => ({
        claim_id: claim.id,
        claim_type: claim.claim_type,
        issuer_id: claim.issuer_id,
        status: claim.status,
      })),
      materialized_claims: evaluated.materialized_claims,
      sandbox_labeled: evaluated.sandbox_labeled,
    };
  }

  if (input.presentation.kind === "wallet_session_binding") {
    if (input.presentation.wallet_address !== input.walletSubject) {
      return { ok: false, code: "wallet_subject_mismatch" };
    }
    return {
      ok: true,
      claim_refs: [{
        claim_id: "wallet-binding",
        claim_type: "wallet_binding_confirmed",
        issuer_id: "issuer:wallet_signature",
        status: "active",
      }],
    };
  }

  const receipt = input.presentation.receipt as PartnerFlowPublicReceipt;
  const trust = evaluatePublicReceiptTrust(receipt, {
    partnerId: input.partnerId,
    policyId: input.policyId,
    allowSandbox: true,
  });
  if (!trust.signature_valid) {
    return { ok: false, code: "evidence_signature_invalid" };
  }
  if (!trust.currently_valid) {
    return { ok: false, code: "evidence_not_currently_valid" };
  }
  const claimType = receipt.evaluated_claim_refs?.[0]?.claim_type ?? "identity_verified";
  return {
    ok: true,
    claim_refs: [{
      claim_id: "presented-receipt",
      claim_type: String(claimType),
      issuer_id:
        (receipt as { issuer_refs?: string[] }).issuer_refs?.[0]
        ?? receipt.evaluated_claim_refs?.[0]?.issuer_id
        ?? "issuer:unknown",
      status: "active",
    }],
  };
}
