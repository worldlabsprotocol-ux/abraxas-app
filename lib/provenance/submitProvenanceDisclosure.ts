// FILE: lib/provenance/submitProvenanceDisclosure.ts
// Holder disclosure submission — hash-only, transient bytes discarded at boundary.

import { normalizeSuiAddress } from "@mysten/sui/utils";
import { upsertClaims } from "@/lib/credentials/claimsService";
import { isContentOriginDisclosurePolicyId } from "./constants";
import {
  aiAssistanceDisclosedClaim,
  creatorAttestedClaim,
  sourceIntegrityVerifiedClaim,
} from "./claims";
import { upsertArtifactBinding } from "./artifactStore";
import { saveProvenanceSubmission } from "./provenanceSessionStore";
import type { AiAssistanceCategory } from "./types";

const AI_CATEGORIES: AiAssistanceCategory[] = [
  "none_declared",
  "editing_assistance",
  "generative_assistance",
  "substantially_generated",
];

export interface SubmitProvenanceDisclosureInput {
  subjectId: string;
  partnerId: string;
  policyId: string;
  contentHash: string;
  contentType: string;
  byteLength: number;
  creatorAttested: boolean;
  aiCategory: AiAssistanceCategory;
}

export type SubmitProvenanceDisclosureResult =
  | { ok: true; artifact_id: string; content_hash: string }
  | { ok: false; code: string; status: number };

function isValidContentHash(value: string): boolean {
  return /^[a-f0-9]{64}$/.test(value.trim().toLowerCase());
}

export async function submitProvenanceDisclosure(
  input: SubmitProvenanceDisclosureInput,
): Promise<SubmitProvenanceDisclosureResult> {
  if (!isContentOriginDisclosurePolicyId(input.policyId)) {
    return { ok: false, code: "unsupported_policy", status: 400 };
  }

  const contentHash = input.contentHash.trim().toLowerCase();
  if (!isValidContentHash(contentHash)) {
    return { ok: false, code: "invalid_content_hash", status: 400 };
  }

  if (!input.creatorAttested) {
    return { ok: false, code: "creator_attestation_required", status: 400 };
  }

  if (!AI_CATEGORIES.includes(input.aiCategory)) {
    return { ok: false, code: "invalid_ai_category", status: 400 };
  }

  const subject = normalizeSuiAddress(input.subjectId);
  const binding = await upsertArtifactBinding({
    subjectId: subject,
    contentHash,
    contentType: input.contentType,
    byteLength: Math.max(0, input.byteLength),
    bindingMethod: "creator_attestation",
  });

  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  saveProvenanceSubmission({
    subjectId: subject,
    policyId: input.policyId,
    contentHash,
  });

  await upsertClaims([
    creatorAttestedClaim({
      subjectId: subject,
      artifactId: binding.artifact_id,
      contentHash,
      expiresAt,
    }),
    aiAssistanceDisclosedClaim({
      subjectId: subject,
      artifactId: binding.artifact_id,
      contentHash,
      category: input.aiCategory,
      expiresAt,
    }),
    sourceIntegrityVerifiedClaim({
      subjectId: subject,
      artifactId: binding.artifact_id,
      contentHash,
      expiresAt,
    }),
  ]);

  return {
    ok: true,
    artifact_id: binding.artifact_id,
    content_hash: contentHash,
  };
}
