// FILE: lib/decisionReceipts/v1_1_0/sidecar.ts
// Persist v1.1.0 signed fields without a schema migration (interim until dedicated columns).

import { EVIDENCE_COMMITMENT_SCHEMA } from "@/lib/decisionReceipts/schema/v1_1_0";
import type {
  EvidenceCommitmentEntryV1,
  EvidenceCommitmentV1,
} from "@/lib/decisionReceipts/schema/v1_1_0";

export const V1_1_SIDECAR_PREFIX = "abraxas.receipt.v1_1.sidecar:" as const;
export const V1_1_SIDECAR_SCHEMA = "abraxas.receipt.v1_1.sidecar/v1" as const;

export type ReceiptV11IssuancePhase = "pending" | "final";

export type ReceiptV11Sidecar = {
  schema: typeof V1_1_SIDECAR_SCHEMA;
  issuance_phase: ReceiptV11IssuancePhase;
  application_binding_ref: string | null;
  evidence_commitment: EvidenceCommitmentV1 | null;
  evidence_commitment_manifest: EvidenceCommitmentEntryV1[] | null;
};

export type SidecarDecodeResult =
  | { ok: true; sidecar: ReceiptV11Sidecar }
  | { ok: false; reason: "missing" | "malformed" | "schema_unknown" | "phase_invalid" | "commitment_inconsistent" };

function isCommitment(value: unknown): value is EvidenceCommitmentV1 {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  return row.schema === EVIDENCE_COMMITMENT_SCHEMA
    && typeof row.digest === "string"
    && typeof row.entry_count === "number";
}

function isManifestEntry(value: unknown): value is EvidenceCommitmentEntryV1 {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  const type = row.dependency_type;
  return (type === "reusable_fact" || type === "source_receipt" || type === "derived_from")
    && (row.fact_id === null || typeof row.fact_id === "string")
    && (row.source_credential_id === null || typeof row.source_credential_id === "string");
}

export function validateReceiptV11Sidecar(parsed: unknown): SidecarDecodeResult {
  if (!parsed || typeof parsed !== "object") return { ok: false, reason: "malformed" };
  const row = parsed as Record<string, unknown>;
  if (row.schema !== V1_1_SIDECAR_SCHEMA) return { ok: false, reason: "schema_unknown" };
  if (row.issuance_phase !== "pending" && row.issuance_phase !== "final") {
    return { ok: false, reason: "phase_invalid" };
  }
  const commitment = row.evidence_commitment;
  if (commitment !== null && commitment !== undefined && !isCommitment(commitment)) {
    return { ok: false, reason: "malformed" };
  }
  const manifest = row.evidence_commitment_manifest;
  if (manifest !== null && manifest !== undefined) {
    if (!Array.isArray(manifest) || !manifest.every(isManifestEntry)) {
      return { ok: false, reason: "malformed" };
    }
  }
  const sidecar: ReceiptV11Sidecar = {
    schema: V1_1_SIDECAR_SCHEMA,
    issuance_phase: row.issuance_phase as ReceiptV11IssuancePhase,
    application_binding_ref: (row.application_binding_ref as string | null) ?? null,
    evidence_commitment: (commitment as EvidenceCommitmentV1 | null) ?? null,
    evidence_commitment_manifest: (manifest as EvidenceCommitmentEntryV1[] | null) ?? null,
  };
  const entryCount = sidecar.evidence_commitment?.entry_count ?? 0;
  const manifestLen = sidecar.evidence_commitment_manifest?.length ?? 0;
  if (sidecar.issuance_phase === "final") {
    if (!sidecar.evidence_commitment) return { ok: false, reason: "commitment_inconsistent" };
    if (entryCount !== manifestLen) return { ok: false, reason: "commitment_inconsistent" };
  }
  if (sidecar.issuance_phase === "pending" && sidecar.evidence_commitment_manifest?.length) {
    return { ok: false, reason: "commitment_inconsistent" };
  }
  return { ok: true, sidecar };
}

export function encodeReceiptV11Sidecar(fields: ReceiptV11Sidecar): string {
  const validated = validateReceiptV11Sidecar(fields);
  if (!validated.ok) throw new Error(`sidecar_invalid:${validated.reason}`);
  return `${V1_1_SIDECAR_PREFIX}${Buffer.from(JSON.stringify(fields), "utf8").toString("base64url")}`;
}

export function decodeReceiptV11Sidecar(anchorReference: string | null | undefined): SidecarDecodeResult {
  if (!anchorReference) return { ok: false, reason: "missing" };
  if (!anchorReference.startsWith(V1_1_SIDECAR_PREFIX)) return { ok: false, reason: "malformed" };
  try {
    const json = Buffer.from(anchorReference.slice(V1_1_SIDECAR_PREFIX.length), "base64url").toString("utf8");
    return validateReceiptV11Sidecar(JSON.parse(json));
  } catch {
    return { ok: false, reason: "malformed" };
  }
}

export function assertExternalAnchorCompatibleWithV11Sidecar(
  externalAnchor: string | null | undefined,
): { ok: true } | { ok: false; reason: "v11_anchor_sidecar_conflict" } {
  if (!externalAnchor) return { ok: true };
  if (externalAnchor.startsWith(V1_1_SIDECAR_PREFIX)) return { ok: true };
  return { ok: false, reason: "v11_anchor_sidecar_conflict" };
}
