import "server-only";

import { readEncryptedEvidence } from "@/lib/persistence/evidenceBlobStore";
import {
  appendEvidenceAccessAuditDirect,
  getEvidenceCustodyRecordDirect,
} from "@/lib/persistence/idvDirectStore";
import type { EvidenceArtifactKind } from "@/lib/persistence/evidenceBlobStore";

export class SovereignEvidenceAccessDeniedError extends Error {
  readonly code = "evidence_access_denied" as const;
}

const ALLOWED_ARTIFACTS = new Set<EvidenceArtifactKind>(["id_front", "selfie", "bundle"]);

export async function readAdminEvidenceByCustody(input: {
  captureSessionId: string;
  artifactKind: EvidenceArtifactKind;
  reviewerId: string;
}): Promise<{ plaintext: Buffer; artifactKind: EvidenceArtifactKind }> {
  if (!ALLOWED_ARTIFACTS.has(input.artifactKind)) {
    throw new SovereignEvidenceAccessDeniedError("invalid_artifact_kind");
  }
  const custody = await getEvidenceCustodyRecordDirect(input.captureSessionId, input.artifactKind);
  if (!custody) {
    await appendEvidenceAccessAuditDirect({
      holderSubjectId: "unknown",
      captureSessionId: input.captureSessionId,
      action: "admin_read",
      actor: input.reviewerId,
      outcome: "denied_missing_custody",
      detail: { artifact_kind: input.artifactKind },
    });
    throw new SovereignEvidenceAccessDeniedError("missing_custody");
  }
  try {
    const plain = readEncryptedEvidence({ storagePath: custody.storage_path });
    await appendEvidenceAccessAuditDirect({
      holderSubjectId: custody.holder_subject_id,
      captureSessionId: input.captureSessionId,
      action: "admin_read",
      actor: input.reviewerId,
      outcome: "ok",
      detail: { artifact_kind: input.artifactKind },
    });
    return { plaintext: plain, artifactKind: input.artifactKind };
  } catch {
    await appendEvidenceAccessAuditDirect({
      holderSubjectId: custody.holder_subject_id,
      captureSessionId: input.captureSessionId,
      action: "admin_read",
      actor: input.reviewerId,
      outcome: "decrypt_failed",
      detail: { artifact_kind: input.artifactKind },
    });
    throw new SovereignEvidenceAccessDeniedError("decrypt_failed");
  }
}
