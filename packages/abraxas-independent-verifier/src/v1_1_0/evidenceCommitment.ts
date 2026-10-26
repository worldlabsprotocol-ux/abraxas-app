import { createHash, createHmac } from "node:crypto";
import { canonicalizeJson } from "../canonical";
import { EVIDENCE_COMMITMENT_DOMAIN, EVIDENCE_COMMITMENT_SCHEMA } from "./constants";

export type EvidenceDependencyType = "reusable_fact" | "source_receipt" | "derived_from";

export type EvidenceCommitmentEntryV1 = {
  dependency_type: EvidenceDependencyType;
  fact_id: string | null;
  source_credential_id: string | null;
};

export type EvidenceCommitmentV1 = {
  schema: typeof EVIDENCE_COMMITMENT_SCHEMA;
  digest: string;
  entry_count: number;
};

function sortEntries(entries: EvidenceCommitmentEntryV1[]): EvidenceCommitmentEntryV1[] {
  return [...entries].sort((a, b) => {
    const ta = a.dependency_type.localeCompare(b.dependency_type);
    if (ta !== 0) return ta;
    const fa = (a.fact_id ?? "").localeCompare(b.fact_id ?? "");
    if (fa !== 0) return fa;
    return (a.source_credential_id ?? "").localeCompare(b.source_credential_id ?? "");
  });
}

/** Blinded ref for low-entropy identifiers at issuance (optional). Verifier receives manifest with blinded refs only. */
export function blindEvidenceRef(
  material: string,
  blindingKey: Buffer | string,
): string {
  return createHmac("sha256", blindingKey).update(material, "utf8").digest("hex");
}

export function computeEvidenceCommitmentDigest(entries: EvidenceCommitmentEntryV1[]): string {
  const normalized = sortEntries(entries).map((e) => ({
    dependency_type: e.dependency_type,
    fact_id: e.fact_id,
    source_credential_id: e.source_credential_id,
  }));
  const body = canonicalizeJson({
    schema: EVIDENCE_COMMITMENT_SCHEMA,
    entries: normalized,
  });
  return createHash("sha256").update(EVIDENCE_COMMITMENT_DOMAIN, "utf8").update(body, "utf8").digest("hex");
}

export function buildEvidenceCommitment(entries: EvidenceCommitmentEntryV1[]): EvidenceCommitmentV1 {
  const sorted = sortEntries(entries);
  return {
    schema: EVIDENCE_COMMITMENT_SCHEMA,
    digest: computeEvidenceCommitmentDigest(sorted),
    entry_count: sorted.length,
  };
}

export function verifyEvidenceCommitment(input: {
  commitment: EvidenceCommitmentV1 | null | undefined;
  manifest: EvidenceCommitmentEntryV1[] | null | undefined;
}): { ok: true } | { ok: false; reason: string } {
  if (!input.commitment) return { ok: false, reason: "evidence_commitment_missing" };
  if (!input.manifest) return { ok: false, reason: "evidence_commitment_manifest_missing" };
  if (input.commitment.schema !== EVIDENCE_COMMITMENT_SCHEMA) {
    return { ok: false, reason: "evidence_commitment_schema_unknown" };
  }
  if (input.commitment.entry_count !== input.manifest.length) {
    return { ok: false, reason: "evidence_commitment_entry_count_mismatch" };
  }
  const digest = computeEvidenceCommitmentDigest(input.manifest);
  if (digest !== input.commitment.digest) {
    return { ok: false, reason: "evidence_commitment_digest_mismatch" };
  }
  return { ok: true };
}
