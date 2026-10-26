// FILE: lib/partner/trustExecution/trustExecutionTypes.ts

import type { DecisionReceiptRecord } from "@/lib/decisionReceipts/types";
import type { SignedIssuerAuthorityStatement } from "@/lib/persistence/boundary/issuerAuthority/contract";
import type { SignedReceiptStatusStatement } from "@abraxas/independent-verifier";

export type ConsumedTrustAuthorization = {
  challenge_id: string;
  partner_id: string;
  application_id: string;
  policy_id: string;
  policy_version: number;
  correlation_id: string;
  wallet_binding_ref: string;
  wallet_address: string;
  subject_pseudonym_id: string;
};

export type TrustExecutionVerificationMaterial = {
  portable_receipt: ReturnType<
    typeof import("@/lib/decisionReceipts/independentVerifierBridge").toIndependentVerifierRecord
  >;
  signed_issuer_authority: SignedIssuerAuthorityStatement | null;
  signed_status_statement: SignedReceiptStatusStatement | null;
};

export type ExecuteTrustExecutionSuccess = {
  ok: true;
  receipt: DecisionReceiptRecord;
  decision_result: "approved" | "denied" | "indeterminate";
  evidence_mode: "controlled_test_evidence" | "live_authoritative_evidence";
  verification_material: TrustExecutionVerificationMaterial;
  outcome_created: boolean;
};

export type ExecuteTrustExecutionFailure = {
  ok: false;
  code: string;
  decision_result?: "denied" | "indeterminate";
};
