// FILE: lib/protocol/portableRevocation/checkpointStore.ts
// Issuer-scoped checkpoint metadata only — no holder identity or personal evidence.

import { createHash } from "node:crypto";
import { mkdir, open, readFile, rename, unlink, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { PortableRevocationCheckpoint } from "./contract";
import {
  compareAndAdvanceCheckpointState,
  type CompareAndAdvanceCheckpointResult,
  type PortableRevocationCheckpointContinuity,
} from "./checkpointAdvance";
import { acquireOwnerAwareCheckpointLock } from "./checkpointLock";

export type PortableRevocationCheckpointCandidate = PortableRevocationCheckpoint &
  PortableRevocationCheckpointContinuity;

export type CompareAndAdvanceCheckpointOptions = {
  /** When false, run continuity validation under lock but do not persist advances. Default true. */
  persist?: boolean;
};

export interface PortableRevocationCheckpointStore {
  getCheckpoint(revocationIssuerId: string): Promise<PortableRevocationCheckpoint | null>;
  compareAndAdvanceCheckpoint(
    candidate: PortableRevocationCheckpointCandidate,
    options?: CompareAndAdvanceCheckpointOptions,
  ): Promise<CompareAndAdvanceCheckpointResult>;
}

function parseCheckpoint(raw: string, issuerId: string): PortableRevocationCheckpoint | null {
  try {
    const parsed = JSON.parse(raw) as PortableRevocationCheckpoint;
    if (parsed.revocation_issuer_id !== issuerId) return null;
    if (!Number.isInteger(parsed.highest_sequence) || parsed.highest_sequence < 1) return null;
    if (typeof parsed.last_payload_hash !== "string" || parsed.last_payload_hash.length !== 64) {
      return null;
    }
    if (typeof parsed.updated_at !== "string" || parsed.updated_at.length === 0) return null;
    return parsed;
  } catch {
    return null;
  }
}

async function durableWriteJson(path: string, payload: unknown): Promise<void> {
  const dir = dirname(path);
  const tempPath = `${path}.${process.pid}.${Date.now()}.tmp`;
  const handle = await open(tempPath, "w");
  try {
    await handle.writeFile(`${JSON.stringify(payload)}\n`, "utf8");
    await handle.sync();
    await handle.close();
    await rename(tempPath, path);
    try {
      const dirHandle = await open(dir, "r");
      await dirHandle.sync();
      await dirHandle.close();
    } catch {
      /* directory fsync best-effort */
    }
  } catch (error) {
    try {
      await unlink(tempPath);
    } catch {
      /* ignore */
    }
    throw error;
  }
}

function runCompareAndAdvance(input: {
  current: PortableRevocationCheckpoint | null;
  candidate: PortableRevocationCheckpointCandidate;
}): CompareAndAdvanceCheckpointResult {
  const { previous_snapshot_hash, bootstrapped, ...checkpointFields } = input.candidate;
  return compareAndAdvanceCheckpointState({
    current: input.current,
    candidate: checkpointFields,
    continuity: { previous_snapshot_hash, bootstrapped },
  });
}

export class InMemoryPortableRevocationCheckpointStore implements PortableRevocationCheckpointStore {
  private readonly byIssuer = new Map<string, PortableRevocationCheckpoint>();
  private readonly locks = new Map<string, Promise<void>>();

  /** Isolated tests only — never seed production checkpoints without verification. */
  seedForIsolatedTests(checkpoint: PortableRevocationCheckpoint): void {
    this.byIssuer.set(checkpoint.revocation_issuer_id, checkpoint);
  }

  private async withIssuerLock<T>(issuerId: string, fn: () => Promise<T>): Promise<T> {
    const previous = this.locks.get(issuerId) ?? Promise.resolve();
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    this.locks.set(
      issuerId,
      previous.then(() => gate),
    );
    await previous;
    try {
      return await fn();
    } finally {
      release();
    }
  }

  async getCheckpoint(revocationIssuerId: string): Promise<PortableRevocationCheckpoint | null> {
    return this.byIssuer.get(revocationIssuerId) ?? null;
  }

  async compareAndAdvanceCheckpoint(
    candidate: PortableRevocationCheckpointCandidate,
    options: CompareAndAdvanceCheckpointOptions = {},
  ): Promise<CompareAndAdvanceCheckpointResult> {
    const persist = options.persist !== false;
    return this.withIssuerLock(candidate.revocation_issuer_id, async () => {
      const current = await this.getCheckpoint(candidate.revocation_issuer_id);
      const result = runCompareAndAdvance({ current, candidate });
      if (!result.ok) return result;
      if (result.advanced && persist) {
        this.byIssuer.set(candidate.revocation_issuer_id, result.checkpoint);
        return result;
      }
      if (result.advanced && !persist) {
        return { ok: true, advanced: false, checkpoint: current ?? result.checkpoint };
      }
      return result;
    });
  }
}

function issuerFileKey(revocationIssuerId: string): string {
  return createHash("sha256").update(revocationIssuerId.trim(), "utf8").digest("hex");
}

export type FilesystemCheckpointStoreOptions = {
  lockMaxAttempts?: number;
};

export class FilesystemPortableRevocationCheckpointStore implements PortableRevocationCheckpointStore {
  constructor(
    private readonly rootDir: string,
    private readonly options: FilesystemCheckpointStoreOptions = {},
  ) {}

  static async open(
    rootDir: string,
    options: FilesystemCheckpointStoreOptions = {},
  ): Promise<FilesystemPortableRevocationCheckpointStore> {
    await mkdir(rootDir, { recursive: true });
    const probe = join(rootDir, ".write_probe");
    try {
      await writeFile(probe, "ok", { flag: "wx" });
      await unlink(probe);
    } catch {
      throw new Error("checkpoint_storage_not_durable");
    }
    return new FilesystemPortableRevocationCheckpointStore(rootDir, options);
  }

  private checkpointPath(revocationIssuerId: string): string {
    return join(this.rootDir, `${issuerFileKey(revocationIssuerId)}.checkpoint.json`);
  }

  private lockPath(revocationIssuerId: string): string {
    return join(this.rootDir, `${issuerFileKey(revocationIssuerId)}.lock`);
  }

  async getCheckpoint(revocationIssuerId: string): Promise<PortableRevocationCheckpoint | null> {
    let release: (() => Promise<void>) | null = null;
    try {
      const lock = await acquireOwnerAwareCheckpointLock(this.lockPath(revocationIssuerId), {
        maxAttempts: this.options.lockMaxAttempts,
      });
      release = lock.release;
    } catch {
      throw new Error("checkpoint_storage_unavailable");
    }
    try {
      const path = this.checkpointPath(revocationIssuerId);
      try {
        const raw = await readFile(path, "utf8");
        const parsed = parseCheckpoint(raw, revocationIssuerId);
        if (!parsed) throw new Error("checkpoint_corrupt");
        return parsed;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
        if (error instanceof Error && error.message === "checkpoint_corrupt") {
          throw error;
        }
        throw new Error("checkpoint_storage_unavailable");
      }
    } finally {
      await release();
    }
  }

  async compareAndAdvanceCheckpoint(
    candidate: PortableRevocationCheckpointCandidate,
    options: CompareAndAdvanceCheckpointOptions = {},
  ): Promise<CompareAndAdvanceCheckpointResult> {
    const persist = options.persist !== false;
    let release: (() => Promise<void>) | null = null;
    try {
      const lock = await acquireOwnerAwareCheckpointLock(this.lockPath(candidate.revocation_issuer_id), {
        maxAttempts: this.options.lockMaxAttempts,
      });
      release = lock.release;
    } catch {
      return { ok: false, code: "storage_unavailable", checkpoint: null };
    }

    try {
      const path = this.checkpointPath(candidate.revocation_issuer_id);
      let current: PortableRevocationCheckpoint | null = null;
      try {
        const raw = await readFile(path, "utf8");
        current = parseCheckpoint(raw, candidate.revocation_issuer_id);
        if (!current) {
          return { ok: false, code: "corrupt_checkpoint", checkpoint: null };
        }
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
          return { ok: false, code: "storage_unavailable", checkpoint: null };
        }
      }

      const result = runCompareAndAdvance({ current, candidate });
      if (!result.ok) return result;
      if (!result.advanced) return result;
      if (!persist) {
        return { ok: true, advanced: false, checkpoint: current ?? result.checkpoint };
      }

      try {
        await durableWriteJson(path, result.checkpoint);
      } catch {
        return { ok: false, code: "storage_unavailable", checkpoint: current };
      }
      return result;
    } finally {
      await release();
    }
  }
}
