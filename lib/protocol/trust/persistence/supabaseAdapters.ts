// Supabase/Postgres adapters — delegate to existing durable implementations.

import { getReceiptById } from "@/lib/decisionReceipts/service";
import { consumeInstitutionalDurableReplayNonce } from "@/lib/institutional/durableReplayNonceStore";
import { appendAuditEvent } from "@/lib/verification/audit";
import { hashPolicyCommitment } from "@/lib/protocol/trust/trustDecisionEnvelope";
import type {
  AuditEventStore,
  PolicyRegistrySnapshotStore,
  ReceiptValidityStore,
  ReplayNonceStore,
  RevocationStore,
} from "@/lib/protocol/trust/persistence/interfaces";

export const supabaseReplayNonceStore: ReplayNonceStore = {
  async reserveConsumeNonce(input) {
    const result = await consumeInstitutionalDurableReplayNonce({
      partnerId: input.partnerId,
      applicationId: input.applicationId || null,
      receiptId: input.receiptId,
      subjectPseudonymId: input.subjectScopeHash,
      policyId: input.policyId,
      policyVersion: input.policyVersion,
      actionScope: input.actionScopeNorm,
      nonce: input.nonceHash,
      expiresAtIso: input.expiresAt,
    });
    if (result.ok) return { ok: true, code: "reserved" };
    return { ok: false, code: result.code };
  },
};

export const supabaseReceiptValidityStore: ReceiptValidityStore = {
  async getReceiptById(receiptId) {
    const row = await getReceiptById(receiptId);
    return row as unknown as Record<string, unknown> | null;
  },
};

export const supabaseRevocationStore: RevocationStore = {
  async isReceiptRevoked(receiptId) {
    const row = await getReceiptById(receiptId);
    return Boolean(row?.revoked_at);
  },
};

export const supabasePolicyRegistrySnapshotStore: PolicyRegistrySnapshotStore = {
  async getPolicyCommitmentHash(policyId, policyVersion) {
    return hashPolicyCommitment(policyId, policyVersion);
  },
};

export const supabaseAuditEventStore: AuditEventStore = {
  async append(event) {
    return appendAuditEvent(event);
  },
};
