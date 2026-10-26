// FILE: lib/decisionReceipts/v1_1_0/resign.server.ts
import "server-only";

import { requireSupabaseAdmin } from "@/lib/supabase/admin";
import type { DecisionReceiptRecord } from "@/lib/decisionReceipts/types";
import { signReceiptPayload } from "@/lib/decisionReceipts/signing";
import { resolveIssuanceSigningKey } from "@/lib/decisionReceipts/verificationKeyLifecycle";
import { getReceiptById } from "@/lib/decisionReceipts/service";
import { DECISION_RECEIPT_SCHEMA_V1_1 } from "@/lib/decisionReceipts/schema/v1_1_0";
import {
  AuthoritativeIssuanceError,
  buildAuthoritativeEvidenceCommitment,
  resolveAuthoritativeApplicationBindingRef,
} from "@/lib/decisionReceipts/v1_1_0/authoritativeIssuance.server";
import { buildSignedCanonicalV11, attachV11FieldsFromSidecar } from "@/lib/decisionReceipts/v1_1_0/canonicalIssuance";
import { encodeReceiptV11Sidecar } from "@/lib/decisionReceipts/v1_1_0/sidecar";

export async function resignDecisionReceiptV11AfterFinalization(input: {
  receiptId: string;
  applicationId: string | null | undefined;
  env?: Record<string, string | undefined>;
}): Promise<DecisionReceiptRecord> {
  const existing = await getReceiptById(input.receiptId);
  if (!existing) throw new Error("receipt_missing");
  if (existing.schema_version !== DECISION_RECEIPT_SCHEMA_V1_1) return existing;

  const application_binding_ref = await resolveAuthoritativeApplicationBindingRef({
    partnerId: existing.partner_id,
    policyId: existing.policy_id,
    policyVersion: existing.policy_version,
    decisionContext: existing.decision_context,
    applicationId: input.applicationId,
    env: input.env,
  });

  const evidence_commitment = await buildAuthoritativeEvidenceCommitment({
    receiptId: existing.id,
    requireFinalizedGraph: true,
    env: input.env,
  });

  const anchor_reference = encodeReceiptV11Sidecar({
    application_binding_ref,
    evidence_commitment,
  });

  const recordForSign = attachV11FieldsFromSidecar({
    ...existing,
    anchor_reference,
    application_binding_ref,
    evidence_commitment,
  });

  const { payload } = buildSignedCanonicalV11(recordForSign);
  const signingKey = resolveIssuanceSigningKey({ schemaVersion: DECISION_RECEIPT_SCHEMA_V1_1, env: input.env });
  if (!signingKey.ok) throw new Error("receipt_signing_unavailable");

  const { payloadHash, signature } = signReceiptPayload(
    payload as unknown as import("@/lib/decisionReceipts/types").DecisionReceiptCanonicalPayload,
    signingKey.privateKeyJwk,
  );

  const sb = requireSupabaseAdmin();
  const { error } = await sb
    .from("decision_receipts")
    .update({
      payload_hash: payloadHash,
      signature,
      anchor_reference,
    })
    .eq("id", existing.id);

  if (error) throw new Error(error.message);

  const updated = await getReceiptById(existing.id);
  if (!updated) throw new Error("receipt_update_missing");
  return updated;
}
