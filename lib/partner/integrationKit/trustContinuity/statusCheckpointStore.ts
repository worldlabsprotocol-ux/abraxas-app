// FILE: lib/partner/integrationKit/trustContinuity/statusCheckpointStore.ts
// Partner-side durable minimum status/registry versions (per receipt scope).

export type StatusCheckpointScope = {
  environment: "demo" | "production";
  partner_id: string;
  receipt_id: string;
};

export type PersistedStatusCheckpoint = {
  minimum_status_version: number;
  /** Floor for SIAS registry_version anti-rollback (distinct from receipt status_version). */
  minimum_registry_version: number;
  last_authenticated_at: string;
  checkpoint_schema: "abraxas_partner_status_checkpoint/1.0.0";
};

export type CheckpointCommitInput = {
  observed_status_version: number;
  observed_registry_version: number;
  authenticated_at: string;
};

export type CheckpointCommitResult =
  | { ok: true; checkpoint: PersistedStatusCheckpoint }
  | {
    ok: false;
    reason:
      | "status_version_rollback_rejected"
      | "registry_version_rollback_rejected"
      | "corrupted_checkpoint_state"
      | "concurrency_conflict";
  };

export interface PartnerStatusCheckpointStore {
  read(scope: StatusCheckpointScope): Promise<PersistedStatusCheckpoint | null>;
  commitMonotonic(scope: StatusCheckpointScope, input: CheckpointCommitInput): Promise<CheckpointCommitResult>;
  /** When persisted state is unreadable, fail closed before verification. */
  healthCheck?(): Promise<"ok" | "corrupted_checkpoint_state">;
}

export function scopeKey(scope: StatusCheckpointScope): string {
  return `${scope.environment}|${scope.partner_id}|${scope.receipt_id}`;
}

export function validatePersistedCheckpoint(raw: unknown): PersistedStatusCheckpoint | "corrupted_checkpoint_state" {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return "corrupted_checkpoint_state";
  const row = raw as Record<string, unknown>;
  if (row.checkpoint_schema !== "abraxas_partner_status_checkpoint/1.0.0") {
    return "corrupted_checkpoint_state";
  }
  if (typeof row.minimum_status_version !== "number" || row.minimum_status_version < 0) {
    return "corrupted_checkpoint_state";
  }
  if (typeof row.minimum_registry_version !== "number" || row.minimum_registry_version < 0) {
    return "corrupted_checkpoint_state";
  }
  if (typeof row.last_authenticated_at !== "string" || !row.last_authenticated_at.trim()) {
    return "corrupted_checkpoint_state";
  }
  return raw as PersistedStatusCheckpoint;
}

export class InMemoryPartnerStatusCheckpointStore implements PartnerStatusCheckpointStore {
  private readonly map = new Map<string, PersistedStatusCheckpoint>();

  async read(scope: StatusCheckpointScope): Promise<PersistedStatusCheckpoint | null> {
    return this.map.get(scopeKey(scope)) ?? null;
  }

  async commitMonotonic(scope: StatusCheckpointScope, input: CheckpointCommitInput): Promise<CheckpointCommitResult> {
    const key = scopeKey(scope);
    const existing = this.map.get(key) ?? null;
    if (existing) {
      if (input.observed_status_version < existing.minimum_status_version) {
        return { ok: false, reason: "status_version_rollback_rejected" };
      }
      if (input.observed_registry_version < existing.minimum_registry_version) {
        return { ok: false, reason: "registry_version_rollback_rejected" };
      }
    }
    const checkpoint: PersistedStatusCheckpoint = {
      checkpoint_schema: "abraxas_partner_status_checkpoint/1.0.0",
      minimum_status_version: Math.max(existing?.minimum_status_version ?? 0, input.observed_status_version),
      minimum_registry_version: Math.max(existing?.minimum_registry_version ?? 0, input.observed_registry_version),
      last_authenticated_at: input.authenticated_at,
    };
    this.map.set(key, checkpoint);
    return { ok: true, checkpoint };
  }
}

type FileStoreShape = {
  schema: "abraxas_partner_status_checkpoint_store/1.0.0";
  checkpoints: Record<string, PersistedStatusCheckpoint>;
};

export class FilePartnerStatusCheckpointStore implements PartnerStatusCheckpointStore {
  constructor(private readonly filePath: string) {}

  async healthCheck(): Promise<"ok" | "corrupted_checkpoint_state"> {
    const loaded = await this.load();
    return loaded === "corrupted_checkpoint_state" ? "corrupted_checkpoint_state" : "ok";
  }

  private async load(): Promise<FileStoreShape | "corrupted_checkpoint_state"> {
    const { readFile } = await import("node:fs/promises");
    try {
      const raw = await readFile(this.filePath, "utf8");
      const parsed = JSON.parse(raw) as FileStoreShape;
      if (parsed.schema !== "abraxas_partner_status_checkpoint_store/1.0.0") {
        return "corrupted_checkpoint_state";
      }
      if (!parsed.checkpoints || typeof parsed.checkpoints !== "object") {
        return "corrupted_checkpoint_state";
      }
      for (const value of Object.values(parsed.checkpoints)) {
        if (validatePersistedCheckpoint(value) === "corrupted_checkpoint_state") {
          return "corrupted_checkpoint_state";
        }
      }
      return parsed;
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code === "ENOENT") {
        return { schema: "abraxas_partner_status_checkpoint_store/1.0.0", checkpoints: {} };
      }
      return "corrupted_checkpoint_state";
    }
  }

  private async save(store: FileStoreShape): Promise<void> {
    const { writeFile, rename, mkdir } = await import("node:fs/promises");
    const { dirname } = await import("node:path");
    await mkdir(dirname(this.filePath), { recursive: true });
    const tmp = `${this.filePath}.tmp.${process.pid}`;
    await writeFile(tmp, `${JSON.stringify(store, null, 2)}\n`, "utf8");
    await rename(tmp, this.filePath);
  }

  async read(scope: StatusCheckpointScope): Promise<PersistedStatusCheckpoint | null> {
    const loaded = await this.load();
    if (loaded === "corrupted_checkpoint_state") return null;
    const cp = loaded.checkpoints[scopeKey(scope)];
    if (!cp) return null;
    const validated = validatePersistedCheckpoint(cp);
    return validated === "corrupted_checkpoint_state" ? null : validated;
  }

  async commitMonotonic(scope: StatusCheckpointScope, input: CheckpointCommitInput): Promise<CheckpointCommitResult> {
    const loaded = await this.load();
    if (loaded === "corrupted_checkpoint_state") {
      return { ok: false, reason: "corrupted_checkpoint_state" };
    }
    const key = scopeKey(scope);
    const existing = loaded.checkpoints[key] ?? null;
    if (existing) {
      const validated = validatePersistedCheckpoint(existing);
      if (validated === "corrupted_checkpoint_state") {
        return { ok: false, reason: "corrupted_checkpoint_state" };
      }
      if (input.observed_status_version < validated.minimum_status_version) {
        return { ok: false, reason: "status_version_rollback_rejected" };
      }
      if (input.observed_registry_version < validated.minimum_registry_version) {
        return { ok: false, reason: "registry_version_rollback_rejected" };
      }
    }

    const checkpoint: PersistedStatusCheckpoint = {
      checkpoint_schema: "abraxas_partner_status_checkpoint/1.0.0",
      minimum_status_version: Math.max(existing?.minimum_status_version ?? 0, input.observed_status_version),
      minimum_registry_version: Math.max(existing?.minimum_registry_version ?? 0, input.observed_registry_version),
      last_authenticated_at: input.authenticated_at,
    };

    loaded.checkpoints[key] = checkpoint;
    await this.save(loaded);
    return { ok: true, checkpoint };
  }
}

export type CheckpointFailureReason = Extract<
  CheckpointCommitResult,
  { ok: false }
>["reason"];

/** When checkpoint store is unreadable — fail closed (indeterminate), do not reset to zero silently. */
export function checkpointRecoveryGuidance(reason: CheckpointFailureReason): string {
  switch (reason) {
    case "corrupted_checkpoint_state":
      return "Restore checkpoint backup or re-bootstrap minimum versions from audited ops records; do not permit until restored.";
    case "concurrency_conflict":
      return "Retry verification; another worker advanced the checkpoint.";
    case "status_version_rollback_rejected":
    case "registry_version_rollback_rejected":
      return "Fetch fresh portable evidence; stale signed status or registry snapshot rejected.";
    default:
      return "Treat as indeterminate; investigate before granting access.";
  }
}
