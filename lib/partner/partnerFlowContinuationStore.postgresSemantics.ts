// FILE: lib/partner/partnerFlowContinuationStore.postgresSemantics.ts
// Test double that enforces Postgres-like uniqueness on opaque_verify_request and verify_request_id.

import {
  continuationVerifyRequestColumns,
  continuationVerifyRequestLookupColumn,
  readContinuationVerifyRequestId,
} from "@/lib/partner/partnerFlowContinuationIdentifiers";
import { isPostgresUniqueViolation } from "@/lib/partner/partnerFlowContinuationPostgresErrors";
import {
  ContinuationUniqueConflictError,
  type PartnerFlowContinuationRecord,
  type PartnerFlowContinuationStore,
} from "@/lib/partner/partnerFlowContinuation";

type Row = PartnerFlowContinuationRecord & {
  verify_request_id: string | null;
  opaque_verify_request: string | null;
};

function toRow(record: PartnerFlowContinuationRecord): Row {
  const columns = continuationVerifyRequestColumns(record.verifyRequestId);
  return {
    ...record,
    verify_request_id: columns.verify_request_id,
    opaque_verify_request: columns.opaque_verify_request,
  };
}

function fromRow(row: Row): PartnerFlowContinuationRecord {
  return {
    jti: row.jti,
    partnerId: row.partnerId,
    policyId: row.policyId,
    policyVersion: row.policyVersion,
    returnUrl: row.returnUrl,
    permission: row.permission,
    permissionVersion: row.permissionVersion,
    purpose: row.purpose,
    appSlug: row.appSlug,
    createdAt: row.createdAt,
    expiresAt: row.expiresAt,
    consumedAt: row.consumedAt ?? null,
    verifyRequestId: readContinuationVerifyRequestId(row as unknown as Record<string, unknown>),
  };
}

/** In-memory store with unique indexes matching migration 130 semantics. */
export function createPostgresSemanticsContinuationStore(): PartnerFlowContinuationStore & {
  rowCount(): number;
  rows(): PartnerFlowContinuationRecord[];
} {
  const byJti = new Map<string, Row>();
  const byOpaque = new Map<string, string>();
  const byUuid = new Map<string, string>();

  return {
    rowCount() {
      return byJti.size;
    },
    rows() {
      return Array.from(byJti.values()).map(fromRow);
    },
    async save(record) {
      const row = toRow(record);
      if (row.opaque_verify_request && byOpaque.has(row.opaque_verify_request) && byOpaque.get(row.opaque_verify_request) !== row.jti) {
        throw new ContinuationUniqueConflictError(row.opaque_verify_request);
      }
      if (row.verify_request_id && byUuid.has(row.verify_request_id) && byUuid.get(row.verify_request_id) !== row.jti) {
        const error = {
          code: "23505",
          message: 'duplicate key value violates unique constraint "partner_flow_continuations_verify_request_id_key"',
        };
        if (isPostgresUniqueViolation(error)) {
          throw new ContinuationUniqueConflictError(row.verify_request_id);
        }
      }
      byJti.set(row.jti, row);
      if (row.opaque_verify_request) byOpaque.set(row.opaque_verify_request, row.jti);
      if (row.verify_request_id) byUuid.set(row.verify_request_id, row.jti);
    },
    async peek(jti) {
      const row = byJti.get(jti);
      return row ? fromRow(row) : null;
    },
    async peekByVerifyRequestId(verifyRequestId) {
      const column = continuationVerifyRequestLookupColumn(verifyRequestId);
      const jti = column === "opaque_verify_request"
        ? byOpaque.get(verifyRequestId)
        : byUuid.get(verifyRequestId);
      if (!jti) return null;
      const row = byJti.get(jti);
      return row ? fromRow(row) : null;
    },
    async consume(jti) {
      const row = byJti.get(jti);
      if (!row || row.consumedAt) return null;
      const consumed = { ...row, consumedAt: new Date().toISOString() };
      byJti.set(jti, consumed);
      return fromRow(row);
    },
    async attachVerifyRequestId(jti, verifyRequestId) {
      const row = byJti.get(jti);
      if (!row) return;
      if (byUuid.has(verifyRequestId) && byUuid.get(verifyRequestId) !== jti) {
        throw new ContinuationUniqueConflictError(verifyRequestId);
      }
      if (row.opaque_verify_request) {
        byOpaque.delete(row.opaque_verify_request);
      }
      row.verify_request_id = verifyRequestId;
      row.opaque_verify_request = null;
      row.verifyRequestId = verifyRequestId;
      byUuid.set(verifyRequestId, jti);
      byJti.set(jti, row);
    },
  };
}
