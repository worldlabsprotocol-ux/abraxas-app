// FILE: lib/provenance/provenanceSessionStore.ts
// Transient partner-flow context for artifact-bound provenance requests.

export interface ProvenanceSessionContext {
  verificationRequestId: string;
  partnerId: string;
  policyId: string;
  expectedContentHash: string | null;
  createdAt: string;
  expiresAt: string;
}

const TTL_MS = 30 * 60 * 1000;
const sessions = new Map<string, ProvenanceSessionContext>();

export function resetProvenanceSessionsForTests(): void {
  sessions.clear();
}

export function saveProvenanceSession(input: {
  verificationRequestId: string;
  partnerId: string;
  policyId: string;
  expectedContentHash?: string | null;
}): ProvenanceSessionContext {
  const now = Date.now();
  const record: ProvenanceSessionContext = {
    verificationRequestId: input.verificationRequestId.trim(),
    partnerId: input.partnerId.trim(),
    policyId: input.policyId.trim(),
    expectedContentHash: input.expectedContentHash?.trim().toLowerCase() ?? null,
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + TTL_MS).toISOString(),
  };
  sessions.set(record.verificationRequestId, record);
  return record;
}

export function loadProvenanceSession(verificationRequestId: string): ProvenanceSessionContext | null {
  const record = sessions.get(verificationRequestId.trim());
  if (!record) return null;
  if (new Date(record.expiresAt).getTime() <= Date.now()) {
    sessions.delete(verificationRequestId.trim());
    return null;
  }
  return record;
}

const submissions = new Map<string, { contentHash: string; expiresAt: string }>();

function submissionKey(subjectId: string, policyId: string): string {
  return `${subjectId.trim().toLowerCase()}:${policyId.trim()}`;
}

export function saveProvenanceSubmission(input: {
  subjectId: string;
  policyId: string;
  contentHash: string;
}): void {
  submissions.set(submissionKey(input.subjectId, input.policyId), {
    contentHash: input.contentHash.trim().toLowerCase(),
    expiresAt: new Date(Date.now() + TTL_MS).toISOString(),
  });
}

export function loadProvenanceSubmission(input: {
  subjectId: string;
  policyId: string;
}): string | null {
  const record = submissions.get(submissionKey(input.subjectId, input.policyId));
  if (!record) return null;
  if (new Date(record.expiresAt).getTime() <= Date.now()) {
    submissions.delete(submissionKey(input.subjectId, input.policyId));
    return null;
  }
  return record.contentHash;
}
