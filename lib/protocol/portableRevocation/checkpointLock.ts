// FILE: lib/protocol/portableRevocation/checkpointLock.ts

import { randomUUID } from "node:crypto";
import { hostname } from "node:os";
import { open, readFile, unlink } from "node:fs/promises";

export type CheckpointLockRecord = {
  token: string;
  pid: number;
  hostname: string;
  acquired_at: string;
};

const LOCK_RETRY_MS = 25;
const DEFAULT_LOCK_MAX_ATTEMPTS = 240;

function isProcessAlive(pid: number): boolean {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ESRCH") return false;
    return true;
  }
}

async function readLockRecord(lockPath: string): Promise<CheckpointLockRecord | null> {
  try {
    const raw = await readFile(lockPath, "utf8");
    const parsed = JSON.parse(raw) as CheckpointLockRecord;
    if (!parsed.token || !parsed.pid || !parsed.acquired_at) return null;
    return parsed;
  } catch {
    return null;
  }
}

export type AcquiredCheckpointLock = {
  token: string;
  release: () => Promise<void>;
};

export async function acquireOwnerAwareCheckpointLock(
  lockPath: string,
  options?: { maxAttempts?: number },
): Promise<AcquiredCheckpointLock> {
  const lockMaxAttempts = options?.maxAttempts ?? DEFAULT_LOCK_MAX_ATTEMPTS;
  const token = randomUUID();
  const owner: CheckpointLockRecord = {
    token,
    pid: process.pid,
    hostname: hostname(),
    acquired_at: new Date().toISOString(),
  };

  for (let attempt = 0; attempt < lockMaxAttempts; attempt += 1) {
    try {
      const handle = await open(lockPath, "wx");
      await handle.writeFile(JSON.stringify(owner));
      await handle.sync();
      await handle.close();
      return {
        token,
        release: async () => {
          const current = await readLockRecord(lockPath);
          if (current?.token !== token) return;
          try {
            await unlink(lockPath);
          } catch {
            /* already released */
          }
        },
      };
    } catch {
      const existing = await readLockRecord(lockPath);
      if (!existing) {
        // Lock file present but ownership unreadable — never delete; fail closed after retries.
        await new Promise((resolve) => setTimeout(resolve, LOCK_RETRY_MS));
        continue;
      }
      if (isProcessAlive(existing.pid)) {
        await new Promise((resolve) => setTimeout(resolve, LOCK_RETRY_MS));
        continue;
      }
      try {
        await unlink(lockPath);
      } catch {
        /* live writer recreated lock */
      }
      await new Promise((resolve) => setTimeout(resolve, LOCK_RETRY_MS));
    }
  }
  throw new Error("checkpoint_lock_unavailable");
}
