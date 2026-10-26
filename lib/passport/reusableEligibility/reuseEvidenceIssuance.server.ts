// FILE: lib/passport/reusableEligibility/reuseEvidenceIssuance.server.ts
import "server-only";

import type { EvaluatedClaimRef } from "@/lib/decisionReceipts/types";
import { requireSupabaseAdmin } from "@/lib/supabase/admin";
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
      | "sovereign_evidence_mirror_required",
  ) {
    super(message);
    this.name = "ReuseEvidenceIssuanceError";
  }
}

async function revokeDerivedReceiptForEvidenceFailure(receiptId: string): Promise<void> {
  const sb = requireSupabaseAdmin();
  await sb
    .from("decision_receipts")
    .update({
      status: "revoked",
      revoked_at: new Date().toISOString(),
    })
    .eq("id", receiptId)
    .eq("status", "active");
}

/**
 * Persist reuse evidence and mirror to sovereign PG when configured.
 * Fail closed: if sovereign PG is configured, mirror must succeed or the receipt is revoked.
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

    if (mirror.mirrored) return;

    if (mirror.reason === "sovereign_pg_unconfigured") {
      if (sovereignRequired) {
        throw new ReuseEvidenceIssuanceError(
          "sovereign_pg_pool_missing_after_mirror_skip",
          "sovereign_evidence_mirror_required",
        );
      }
      return;
    }

    if (mirror.reason === "source_unavailable") {
      throw new ReuseEvidenceIssuanceError(
        "evidence_source_unavailable_for_sovereign_mirror",
        "evidence_source_unavailable",
      );
    }

    throw new ReuseEvidenceIssuanceError(
      `unexpected_mirror_state:${mirror.reason}`,
      "sovereign_evidence_mirror_failed",
    );
  } catch (error) {
    await revokeDerivedReceiptForEvidenceFailure(input.derivedReceiptId);
    throw error;
  }
}
