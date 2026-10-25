/**
 * Minimal partner checkpoint persistence for standalone relying parties.
 * Schema matches `FilePartnerStatusCheckpointStore` in Partner Kit (Build #827).
 */
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

export type PartnerCheckpointScope = {
  environment: "demo" | "production";
  partner_id: string;
  receipt_id: string;
};

export type PartnerCheckpoint = {
  checkpoint_schema: "abraxas_partner_status_checkpoint/1.0.0";
  minimum_status_version: number;
  minimum_registry_version: number;
  last_authenticated_at: string;
};

type StoreFile = {
  schema: "abraxas_partner_status_checkpoint_store/1.0.0";
  checkpoints: Record<string, PartnerCheckpoint>;
};

function scopeKey(scope: PartnerCheckpointScope): string {
  return `${scope.environment}|${scope.partner_id}|${scope.receipt_id}`;
}

async function loadStore(filePath: string): Promise<StoreFile | "corrupted"> {
  try {
    const raw = await readFile(filePath, "utf8");
    const parsed = JSON.parse(raw) as StoreFile;
    if (parsed.schema !== "abraxas_partner_status_checkpoint_store/1.0.0") return "corrupted";
    if (!parsed.checkpoints || typeof parsed.checkpoints !== "object") return "corrupted";
    return parsed;
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "ENOENT") {
      return { schema: "abraxas_partner_status_checkpoint_store/1.0.0", checkpoints: {} };
    }
    return "corrupted";
  }
}

async function saveStore(filePath: string, store: StoreFile): Promise<void> {
  await mkdir(dirname(filePath), { recursive: true });
  const tmp = `${filePath}.tmp.${process.pid}`;
  await writeFile(tmp, `${JSON.stringify(store, null, 2)}\n`, "utf8");
  await rename(tmp, filePath);
}

export async function readPartnerCheckpoint(
  filePath: string,
  scope: PartnerCheckpointScope,
): Promise<PartnerCheckpoint | null> {
  const loaded = await loadStore(filePath);
  if (loaded === "corrupted") return null;
  return loaded.checkpoints[scopeKey(scope)] ?? null;
}

export type CommitResult =
  | { ok: true; checkpoint: PartnerCheckpoint }
  | { ok: false; reason: "status_version_rollback_rejected" | "registry_version_rollback_rejected" | "corrupted_checkpoint_state" };

export async function commitPartnerCheckpointMonotonic(
  filePath: string,
  scope: PartnerCheckpointScope,
  input: { observed_status_version: number; observed_registry_version: number; authenticated_at: string },
): Promise<CommitResult> {
  const loaded = await loadStore(filePath);
  if (loaded === "corrupted") return { ok: false, reason: "corrupted_checkpoint_state" };

  const key = scopeKey(scope);
  const existing = loaded.checkpoints[key];
  if (existing) {
    if (input.observed_status_version < existing.minimum_status_version) {
      return { ok: false, reason: "status_version_rollback_rejected" };
    }
    if (input.observed_registry_version < existing.minimum_registry_version) {
      return { ok: false, reason: "registry_version_rollback_rejected" };
    }
  }

  const checkpoint: PartnerCheckpoint = {
    checkpoint_schema: "abraxas_partner_status_checkpoint/1.0.0",
    minimum_status_version: Math.max(existing?.minimum_status_version ?? 0, input.observed_status_version),
    minimum_registry_version: Math.max(existing?.minimum_registry_version ?? 0, input.observed_registry_version),
    last_authenticated_at: input.authenticated_at,
  };
  loaded.checkpoints[key] = checkpoint;
  await saveStore(filePath, loaded);
  return { ok: true, checkpoint };
}
