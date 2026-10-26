// FILE: lib/passport/reusableEligibility/reuseEvidenceIssuance.server.ts
import "server-only";

import type { EvaluatedClaimRef } from "@/lib/decisionReceipts/types";
import { getReceiptById } from "@/lib/decisionReceipts/service";
import {
  activateDecisionReceiptIssuance,
  markDecisionReceiptIssuanceFailed,
} from "@/lib/decisionReceipts/issuanceLifecycle.server";
import { isReceiptIssuanceFinalized } from "@/lib/decisionReceipts/issuanceFinalization";
import { getSovereignStagingPgPool } from "@/lib/persistence/boundary/sovereignStagingPg";
import { mirrorReuseEvidenceIntegrityOnSovereignPg } from "@/lib/persistence/boundary/verticalSlice/evidenceIntegrityWrite.server";
import type { InternalReusableFact } from "./contract";
import { persistReuseDerivation } from "./issue";

export class ReuseEvidenceIssuanceError extends Error {
  constructor(
    message: string,
    readonly code:
      | "evidence_dependency_persist_failed"
      | "evidence_source_unavailable"
      | "sovereign_evidence_mirror_failed"
      | "sovereign_evidence_mirror_required"
      | "issuance_activation_failed"
      | "issuance_already_finalized",
  ) {
    super(message);
    this.name = "ReuseEvidenceIssuanceError";
  }
}

/**
 * Commit evidence dependencies, sovereign mirror (when required), then activate receipt.
 * Receipt must be pending_finalization — never authorizable until this succeeds.
 */
export async function finalizeReuseEvidenceForIssuance(input: {
  fact: InternalReusableFact;
  derivedReceiptId: string;
  derivedDecisionId: string;
  requestingPartnerId: string;
  requestingPolicyId: string;
  requestingPolicyVersion: number;
  verifyRequestId: string;
  derivedClaimRefs: EvaluatedClaimRef[];
  env?: Record<string, string | undefined>;
}): Promise<void> {
  const env = input.env ?? process.env;
  const sovereignRequired = Boolean(getSovereignStagingPgPool(env));

  const existing = await getReceiptById(input.derivedReceiptId);
  if (!existing) {
    throw new ReuseEvidenceIssuanceError("derived_receipt_missing", "issuance_activation_failed");
  }
  if (isReceiptIssuanceFinalized(existing)) {
    return;
  }
  if (existing.status !== "pending_finalization") {
    throw new ReuseEvidenceIssuanceError(
      `unexpected_receipt_status:${existing.status}`,
      "issuance_activation_failed",
    );
  }

  try {
    await persistReuseDerivation({
      fact: input.fact,
      derivedReceiptId: input.derivedReceiptId,
      derivedDecisionId: input.derivedDecisionId,
      requestingPartnerId: input.requestingPartnerId,
      requestingPolicyId: input.requestingPolicyId,
      requestingPolicyVersion: input.requestingPolicyVersion,
      verifyRequestId: input.verifyRequestId,
    });

    const mirror = await mirrorReuseEvidenceIntegrityOnSovereignPg({
      derivedReceiptId: input.derivedReceiptId,
      fact: input.fact,
      derivedClaimRefs: input.derivedClaimRefs,
      env,
    });

    if (!mirror.mirrored) {
      if (mirror.reason === "sovereign_pg_unconfigured") {
        if (sovereignRequired) {
          throw new ReuseEvidenceIssuanceError(
            "sovereign_pg_pool_missing_after_mirror_skip",
            "sovereign_evidence_mirror_required",
          );
        }
      } else if (mirror.reason === "source_unavailable") {
        throw new ReuseEvidenceIssuanceError(
          "evidence_source_unavailable_for_sovereign_mirror",
          "evidence_source_unavailable",
        );
      } else {
        throw new ReuseEvidenceIssuanceError(
          "sovereign_evidence_mirror_failed",
          "sovereign_evidence_mirror_failed",
        );
      }
    }

    await activateDecisionReceiptIssuance(input.derivedReceiptId);
  } catch (error) {
    try {
      await markDecisionReceiptIssuanceFailed(input.derivedReceiptId);
    } catch {
      // Pending receipts remain non-authorizable even if mark fails (fail closed).
    }
    throw error;
  }
}
