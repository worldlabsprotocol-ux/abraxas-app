// FILE: lib/protocol/portableRevocation/checkpointStore.ts
// Issuer-scoped checkpoint metadata only — no holder identity or personal evidence.

import { createHash } from "node:crypto";
import { mkdir, open, readFile, rename, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { PortableRevocationCheckpoint } from "./contract";
import {
  compareAndAdvanceCheckpointState,
  type CompareAndAdvanceCheckpointResult,
} from "./checkpointAdvance";

export type PortableRevocationCheckpointCandidate = {
  revocation_issuer_id: string;
  highest_sequence: number;
  last_payload_hash: string;
  updated_at: string;
};

export interface PortableRevocationCheckpointStore {
  getCheckpoint(revocationIssuerId: string): Promise<PortableRevocationCheckpoint | null>;
  compareAndAdvanceCheckpoint(
    candidate: PortableRevocationCheckpointCandidate,
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
  ): Promise<CompareAndAdvanceCheckpointResult> {
    return this.withIssuerLock(candidate.revocation_issuer_id, async () => {
      const current = await this.getCheckpoint(candidate.revocation_issuer_id);
      const result = compareAndAdvanceCheckpointState({
        current,
        candidate: { ...candidate },
      });
      if (result.ok && result.advanced) {
        this.byIssuer.set(candidate.revocation_issuer_id, result.checkpoint);
      }
      return result;
    });
  }
}

const LOCK_STALE_MS = 30_000;
const LOCK_RETRY_MS = 25;
const LOCK_MAX_ATTEMPTS = 200;

function issuerFileKey(revocationIssuerId: string): string {
  return createHash("sha256").update(revocationIssuerId.trim(), "utf8").digest("hex");
}

export class FilesystemPortableRevocationCheckpointStore implements PortableRevocationCheckpointStore {
  constructor(private readonly rootDir: string) {}

  static async open(rootDir: string): Promise<FilesystemPortableRevocationCheckpointStore> {
    await mkdir(rootDir, { recursive: true });
    const probe = join(rootDir, ".write_probe");
    try {
      await writeFile(probe, "ok", { flag: "wx" });
      await unlink(probe);
    } catch {
      throw new Error("checkpoint_storage_not_durable");
    }
    return new FilesystemPortableRevocationCheckpointStore(rootDir);
  }

  private checkpointPath(revocationIssuerId: string): string {
    return join(this.rootDir, `${issuerFileKey(revocationIssuerId)}.checkpoint.json`);
  }

  private lockPath(revocationIssuerId: string): string {
    return join(this.rootDir, `${issuerFileKey(revocationIssuerId)}.lock`);
  }

  private async acquireLock(revocationIssuerId: string): Promise<() => Promise<void>> {
    const lockPath = this.lockPath(revocationIssuerId);
    for (let attempt = 0; attempt < LOCK_MAX_ATTEMPTS; attempt += 1) {
      try {
        const handle = await open(lockPath, "wx");
        await handle.writeFile(
          JSON.stringify({ pid: process.pid, at: new Date().toISOString() }),
        );
        await handle.close();
        return async () => {
          try {
            await unlink(lockPath);
          } catch {
            /* lock already released */
          }
        };
      } catch {
        try {
          const stat = await readFile(lockPath, "utf8");
          const parsed = JSON.parse(stat) as { at?: string };
          const atMs = parsed.at ? Date.parse(parsed.at) : NaN;
          if (Number.isFinite(atMs) && Date.now() - atMs > LOCK_STALE_MS) {
            await unlink(lockPath);
            continue;
          }
        } catch {
          /* ignore stale probe errors */
        }
        await new Promise((resolve) => setTimeout(resolve, LOCK_RETRY_MS));
      }
    }
    throw new Error("checkpoint_lock_unavailable");
  }

  async getCheckpoint(revocationIssuerId: string): Promise<PortableRevocationCheckpoint | null> {
    let release: (() => Promise<void>) | null = null;
    try {
      release = await this.acquireLock(revocationIssuerId);
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
  ): Promise<CompareAndAdvanceCheckpointResult> {
    let release: (() => Promise<void>) | null = null;
    try {
      release = await this.acquireLock(candidate.revocation_issuer_id);
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

      const result = compareAndAdvanceCheckpointState({
        current,
        candidate: { ...candidate },
      });
      if (!result.ok || !result.advanced) {
        return result;
      }

      const tempPath = `${path}.${process.pid}.${Date.now()}.tmp`;
      try {
        await writeFile(tempPath, `${JSON.stringify(result.checkpoint)}\n`, "utf8");
        await rename(tempPath, path);
      } catch {
        try {
          await unlink(tempPath);
        } catch {
          /* ignore */
        }
        return { ok: false, code: "storage_unavailable", checkpoint: current };
      }
      return result;
    } finally {
      await release();
    }
  }
}
