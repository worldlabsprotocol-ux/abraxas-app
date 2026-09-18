// FILE: lib/partner/launchpad/sandboxReadiness/idempotency.ts
// Tenant-scoped idempotent retries for sandbox readiness runs.

export interface StoredSandboxRun {
  applicationId: string;
  partnerId: string;
  stage: string;
  idempotencyKey: string;
  status: string;
  code: string;
  detail: string;
  at: string;
}

const store = new Map<string, StoredSandboxRun>();

export function resetSandboxIdempotencyStoreForTests(): void {
  store.clear();
}

function key(input: {
  partnerId: string;
  applicationId: string;
  stage: string;
  idempotencyKey: string;
}): string {
  return `${input.partnerId}:${input.applicationId}:${input.stage}:${input.idempotencyKey}`;
}

export function rememberSandboxRun(run: StoredSandboxRun): void {
  store.set(key(run), run);
}

export function recallSandboxRun(input: {
  partnerId: string;
  applicationId: string;
  stage: string;
  idempotencyKey: string;
}): StoredSandboxRun | null {
  return store.get(key(input)) ?? null;
}
