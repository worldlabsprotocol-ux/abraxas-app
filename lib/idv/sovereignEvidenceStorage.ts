// FILE: lib/idv/sovereignEvidenceStorage.ts
import "server-only";

import {
  appendEvidenceAccessAuditDirect,
  assertEvidenceCustodyOwnerDirect,
  registerEvidenceCustodyDirect,
} from "@/lib/persistence/idvDirectStore";
import {
  readEncryptedEvidence,
  storeEncryptedEvidence,
} from "@/lib/persistence/evidenceBlobStore";

export class EvidenceAccessDeniedError extends Error {
  readonly code = "evidence_access_denied" as const;

  constructor(message = "evidence_access_denied") {
    super(message);
    this.name = "EvidenceAccessDeniedError";
  }
}

export class EvidenceStorageUnavailableError extends Error {
  readonly code = "evidence_storage_unavailable" as const;

  constructor() {
    super("evidence_storage_unavailable");
    this.name = "EvidenceStorageUnavailableError";
  }
}

export async function storeHolderEvidenceWithCustody(input: {
  holderSubjectId: string;
  captureSessionId: string;
  plaintext: Buffer;
  retainedUntil?: string | null;
  env?: Record<string, string | undefined>;
}): Promise<{ storagePath: string; contentSha256: string }> {
  try {
    const stored = storeEncryptedEvidence({
      holderSubjectId: input.holderSubjectId,
      captureSessionId: input.captureSessionId,
      plaintext: input.plaintext,
      env: input.env,
    });
    await registerEvidenceCustodyDirect({
      holderSubjectId: input.holderSubjectId,
      captureSessionId: input.captureSessionId,
      storagePath: stored.storagePath,
      contentSha256: stored.contentSha256,
      retainedUntil: input.retainedUntil ?? null,
    });
    await appendEvidenceAccessAuditDirect({
      holderSubjectId: input.holderSubjectId,
      captureSessionId: input.captureSessionId,
      action: "store",
      actor: "idv_capture",
      outcome: "ok",
    });
    return stored;
  } catch {
    throw new EvidenceStorageUnavailableError();
  }
}

export async function readHolderEvidenceAuthorized(input: {
  holderSubjectId: string;
  captureSessionId: string;
  storagePath: string;
  actor: string;
  env?: Record<string, string | undefined>;
}): Promise<Buffer> {
  const ownerOk = await assertEvidenceCustodyOwnerDirect(
    input.holderSubjectId,
    input.captureSessionId,
  );
  if (!ownerOk) {
    await appendEvidenceAccessAuditDirect({
      holderSubjectId: input.holderSubjectId,
      captureSessionId: input.captureSessionId,
      action: "read",
      actor: input.actor,
      outcome: "denied_cross_holder",
    });
    throw new EvidenceAccessDeniedError();
  }
  try {
    const plain = readEncryptedEvidence({ storagePath: input.storagePath, env: input.env });
    await appendEvidenceAccessAuditDirect({
      holderSubjectId: input.holderSubjectId,
      captureSessionId: input.captureSessionId,
      action: "read",
      actor: input.actor,
      outcome: "ok",
    });
    return plain;
  } catch {
    await appendEvidenceAccessAuditDirect({
      holderSubjectId: input.holderSubjectId,
      captureSessionId: input.captureSessionId,
      action: "read",
      actor: input.actor,
      outcome: "decrypt_failed",
    });
    throw new EvidenceStorageUnavailableError();
  }
}
