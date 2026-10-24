// FILE: lib/persistence/boundary/invariants/compareVerticalSlice.ts

import type {
  MeteringAttributionSnapshot,
  ReceiptProvenanceSnapshot,
  VerticalSliceParityMismatch,
  VerticalSliceParityReport,
} from "../types";

function mismatch(
  field: string,
  legacy: string,
  sovereign: string,
  invariant: string,
): VerticalSliceParityMismatch {
  return { field, legacy, sovereign, invariant };
}

export function compareReceiptProvenanceInvariants(
  legacy: ReceiptProvenanceSnapshot,
  sovereign: ReceiptProvenanceSnapshot,
): VerticalSliceParityMismatch[] {
  const out: VerticalSliceParityMismatch[] = [];
  const pairs: Array<[keyof ReceiptProvenanceSnapshot, string]> = [
    ["receiptId", "receipt_identity"],
    ["partnerId", "tenant_binding"],
    ["policyId", "policy_binding"],
    ["policyVersion", "policy_version_binding"],
    ["payloadHash", "payload_integrity_anchor"],
    ["signature", "signed_bytes"],
    ["signingKeyId", "issuer_key_binding"],
    ["storedStatus", "stored_status"],
    ["resolvedLifecycleStatus", "authorization_lifecycle"],
  ];
  for (const [key, invariant] of pairs) {
    const a = String(legacy[key]);
    const b = String(sovereign[key]);
    if (a !== b) out.push(mismatch(String(key), a, b, invariant));
  }
  if (legacy.signatureValid !== sovereign.signatureValid) {
    out.push(
      mismatch(
        "signatureValid",
        String(legacy.signatureValid),
        String(sovereign.signatureValid),
        "offline_cryptographic_verify",
      ),
    );
  }
  if (legacy.expiresAt !== sovereign.expiresAt) {
    out.push(
      mismatch("expiresAt", String(legacy.expiresAt), String(sovereign.expiresAt), "freshness_bound"),
    );
  }
  if (legacy.revokedAt !== sovereign.revokedAt) {
    out.push(
      mismatch("revokedAt", String(legacy.revokedAt), String(sovereign.revokedAt), "revocation_state"),
    );
  }
  return out;
}

export function compareMeteringAttributionInvariants(
  legacy: MeteringAttributionSnapshot,
  sovereign: MeteringAttributionSnapshot,
): VerticalSliceParityMismatch[] {
  const out: VerticalSliceParityMismatch[] = [];
  if (legacy.present !== sovereign.present) {
    out.push(
      mismatch(
        "present",
        String(legacy.present),
        String(sovereign.present),
        "idempotency_presence",
      ),
    );
    return out;
  }
  if (!legacy.present) return out;

  if (legacy.partnerId !== sovereign.partnerId) {
    out.push(mismatch("partnerId", legacy.partnerId, sovereign.partnerId, "metering_tenant"));
  }
  if (legacy.eventType !== sovereign.eventType) {
    out.push(mismatch("eventType", legacy.eventType, sovereign.eventType, "metering_event_type"));
  }
  if (legacy.receiptId !== sovereign.receiptId) {
    out.push(mismatch("receiptId", String(legacy.receiptId), String(sovereign.receiptId), "metering_receipt_link"));
  }
  if (legacy.idempotencyKey !== sovereign.idempotencyKey) {
    out.push(
      mismatch(
        "idempotencyKey",
        legacy.idempotencyKey,
        sovereign.idempotencyKey,
        "exactly_once_key",
      ),
    );
  }
  return out;
}

export function buildVerticalSliceParityReport(input: {
  legacyReceipt: ReceiptProvenanceSnapshot | null;
  sovereignReceipt: ReceiptProvenanceSnapshot | null;
  legacyMetering: MeteringAttributionSnapshot;
  sovereignMetering: MeteringAttributionSnapshot;
}): VerticalSliceParityReport {
  const notes: string[] = [];
  const receiptMismatches: VerticalSliceParityMismatch[] = [];
  const meteringMismatches: VerticalSliceParityMismatch[] = [];

  if (!input.legacyReceipt || !input.sovereignReceipt) {
    notes.push("receipt_provenance_incomplete");
  } else {
    receiptMismatches.push(
      ...compareReceiptProvenanceInvariants(input.legacyReceipt, input.sovereignReceipt),
    );
  }

  meteringMismatches.push(
    ...compareMeteringAttributionInvariants(input.legacyMetering, input.sovereignMetering),
  );

  const ok = receiptMismatches.length === 0 && meteringMismatches.length === 0;
  return {
    ok,
    receipt: { compared: Boolean(input.legacyReceipt && input.sovereignReceipt), mismatches: receiptMismatches },
    metering: { compared: true, mismatches: meteringMismatches },
    notes,
  };
}
