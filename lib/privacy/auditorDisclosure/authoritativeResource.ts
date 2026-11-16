// FILE: lib/privacy/auditorDisclosure/authoritativeResource.ts

import type { DecisionReceiptRecord } from "@/lib/decisionReceipts/types";
import { verifyRecordSignature } from "@/lib/decisionReceipts/views";
import { loadRecordedDecisionReceipt } from "@/lib/institutional/signing/recordedWorkflow";
import type { AuditorDisclosureCustodyMeta } from "./buildSource";

export async function loadAuthoritativeReceiptForAuditorDisclosure(input: {
  receiptId: string;
  tenantPartnerId: string;
  env?: Record<string, string | undefined>;
}): Promise<
  | { ok: true; record: DecisionReceiptRecord; custody: AuditorDisclosureCustodyMeta }
  | { ok: false; reason: string }
> {
  const env = input.env ?? process.env;
  const loaded = await loadRecordedDecisionReceipt({ env, receiptId: input.receiptId });
  if (!loaded.ok) return loaded;

  if (loaded.record.partner_id !== input.tenantPartnerId) {
    return { ok: false, reason: "authoritative_receipt_tenant_mismatch" };
  }

  if (!verifyRecordSignature(loaded.record)) {
    return { ok: false, reason: "authoritative_receipt_signature_invalid" };
  }

  return {
    ok: true,
    record: loaded.record,
    custody: {
      custody_status: loaded.record.revoked_at ? "unknown" : "encrypted_custody",
      evidence_classification: "identity_verification",
      evidence_commitment: null,
    },
  };
}