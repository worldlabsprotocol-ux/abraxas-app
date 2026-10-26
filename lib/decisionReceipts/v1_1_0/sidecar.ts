// FILE: lib/decisionReceipts/v1_1_0/sidecar.ts
// Persist v1.1.0 signed fields without a schema migration (interim until dedicated columns).

import type { EvidenceCommitmentV1 } from "@/lib/decisionReceipts/schema/v1_1_0";

export const V1_1_SIDECAR_PREFIX = "abraxas.receipt.v1_1.sidecar:" as const;

export type ReceiptV11Sidecar = {
  application_binding_ref: string | null;
  evidence_commitment: EvidenceCommitmentV1 | null;
};

export function encodeReceiptV11Sidecar(fields: ReceiptV11Sidecar): string {
  return `${V1_1_SIDECAR_PREFIX}${Buffer.from(JSON.stringify(fields), "utf8").toString("base64url")}`;
}

export function decodeReceiptV11Sidecar(anchorReference: string | null | undefined): ReceiptV11Sidecar | null {
  if (!anchorReference?.startsWith(V1_1_SIDECAR_PREFIX)) return null;
  try {
    const json = Buffer.from(anchorReference.slice(V1_1_SIDECAR_PREFIX.length), "base64url").toString("utf8");
    const parsed = JSON.parse(json) as ReceiptV11Sidecar;
    if (!parsed || typeof parsed !== "object") return null;
    return {
      application_binding_ref: parsed.application_binding_ref ?? null,
      evidence_commitment: parsed.evidence_commitment ?? null,
    };
  } catch {
    return null;
  }
}
