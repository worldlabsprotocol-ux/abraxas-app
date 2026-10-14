// FILE: lib/protocol/portableRevocation/portableRevocation.checkpoint.adversarial.test.ts

import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, afterEach } from "vitest";
import {
  FilesystemPortableRevocationCheckpointStore,
  PORTABLE_REVOCATION_TEST_ISSUER_ID,
} from "@/lib/protocol/portableRevocation";

const workerPath = join(
  process.cwd(),
  "lib/protocol/portableRevocation/checkpointHoldLockWorker.mjs",
);

function issuerKey(): string {
  return createHash("sha256").update(PORTABLE_REVOCATION_TEST_ISSUER_ID.trim(), "utf8").digest("hex");
}

describe("Build #564 checkpoint adversarial durability", () => {
  const dirs: string[] = [];

  afterEach(async () => {
    while (dirs.length > 0) {
      const dir = dirs.pop();
      if (dir) await rm(dir, { recursive: true, force: true });
    }
  });

  async function openStore() {
    const dir = await mkdtemp(join(tmpdir(), "abraxas-checkpoint-adv-"));
    dirs.push(dir);
    return FilesystemPortableRevocationCheckpointStore.open(dir, { lockMaxAttempts: 20 });
  }

  it("live owner lock — compare-and-advance fails closed without stealing", async () => {
    const store = await openStore();
    const dir = (store as unknown as { rootDir: string }).rootDir;
    const lockPath = join(dir, `${issuerKey()}.lock`);
    await writeFile(
      lockPath,
      JSON.stringify({
        token: "live-lock-token",
        pid: process.pid,
        hostname: "test",
        acquired_at: new Date().toISOString(),
      }),
      "utf8",
    );
    const blocked = await store.compareAndAdvanceCheckpoint({
      revocation_issuer_id: PORTABLE_REVOCATION_TEST_ISSUER_ID,
      highest_sequence: 1,
      last_payload_hash: "a".repeat(64),
      updated_at: new Date().toISOString(),
      previous_snapshot_hash: null,
      bootstrapped: true,
    });
    expect(blocked.ok).toBe(false);
    expect(blocked.code).toBe("storage_unavailable");
    const stillLocked = await readFile(lockPath, "utf8");
    expect(stillLocked).toContain("live-lock-token");
  });

  it("cross-process live lock — compare-and-advance fails closed", async () => {
    const store = await openStore();
    const dir = (store as unknown as { rootDir: string }).rootDir;
    const lockPath = join(dir, `${issuerKey()}.lock`);
    const child = spawn(process.execPath, [workerPath, lockPath], {
      stdio: "ignore",
    });
    await new Promise<void>((resolve, reject) => {
      const deadline = Date.now() + 5000;
      const tick = async () => {
        if (Date.now() > deadline) {
          reject(new Error("worker_lock_timeout"));
          return;
        }
        try {
          const raw = await readFile(lockPath, "utf8");
          const parsed = JSON.parse(raw) as { pid?: number };
          if (parsed.pid && parsed.pid > 0) {
            resolve();
            return;
          }
        } catch {
          /* lock not ready */
        }
        setTimeout(() => {
          tick().catch(reject);
        }, 15);
      };
      child.on("error", reject);
      tick().catch(reject);
    });
    expect(child.exitCode).toBeNull();
    expect(child.killed).toBe(false);
    const blocked = await store.compareAndAdvanceCheckpoint({
      revocation_issuer_id: PORTABLE_REVOCATION_TEST_ISSUER_ID,
      highest_sequence: 1,
      last_payload_hash: "a".repeat(64),
      updated_at: new Date().toISOString(),
      previous_snapshot_hash: null,
      bootstrapped: true,
    });
    expect(blocked.ok).toBe(false);
    expect(blocked.code).toBe("storage_unavailable");
    child.kill("SIGTERM");
    await new Promise((resolve) => child.on("close", resolve));
  }, 20_000);

  it("dead-owner lock recovery — new writer can advance", async () => {
    const store = await openStore();
    const dir = (store as unknown as { rootDir: string }).rootDir;
    const lockPath = join(dir, `${issuerKey()}.lock`);
    await writeFile(
      lockPath,
      JSON.stringify({
        token: "dead-token",
        pid: 999_999,
        hostname: "test",
        acquired_at: new Date().toISOString(),
      }),
      "utf8",
    );
    const advanced = await store.compareAndAdvanceCheckpoint({
      revocation_issuer_id: PORTABLE_REVOCATION_TEST_ISSUER_ID,
      highest_sequence: 1,
      last_payload_hash: "b".repeat(64),
      updated_at: new Date().toISOString(),
      previous_snapshot_hash: null,
      bootstrapped: true,
    });
    expect(advanced.ok).toBe(true);
  });

  it("corrupted checkpoint file — fail closed", async () => {
    const store = await openStore();
    const dir = (store as unknown as { rootDir: string }).rootDir;
    const checkpointPath = join(dir, `${issuerKey()}.checkpoint.json`);
    await writeFile(checkpointPath, "{broken-json", "utf8");
    const result = await store.compareAndAdvanceCheckpoint({
      revocation_issuer_id: PORTABLE_REVOCATION_TEST_ISSUER_ID,
      highest_sequence: 2,
      last_payload_hash: "c".repeat(64),
      updated_at: new Date().toISOString(),
      previous_snapshot_hash: "d".repeat(64),
      bootstrapped: false,
    });
    expect(result.ok).toBe(false);
    expect(result.code).toBe("corrupt_checkpoint");
  });

  it("concurrent compare-and-advance — chain validation cannot be skipped", async () => {
    const store = await openStore();
    const base = {
      revocation_issuer_id: PORTABLE_REVOCATION_TEST_ISSUER_ID,
      updated_at: new Date().toISOString(),
      bootstrapped: false,
    };
    const first = await store.compareAndAdvanceCheckpoint({
      ...base,
      highest_sequence: 1,
      last_payload_hash: "e".repeat(64),
      previous_snapshot_hash: null,
      bootstrapped: true,
    });
    expect(first.ok).toBe(true);
    const badLink = await store.compareAndAdvanceCheckpoint({
      ...base,
      highest_sequence: 2,
      last_payload_hash: "f".repeat(64),
      previous_snapshot_hash: "0".repeat(64),
    });
    const goodLink = await store.compareAndAdvanceCheckpoint({
      ...base,
      highest_sequence: 2,
      last_payload_hash: "f".repeat(64),
      previous_snapshot_hash: "e".repeat(64),
    });
    const outcomes = [badLink.ok, goodLink.ok].filter(Boolean).length;
    expect(outcomes).toBe(1);
    expect(badLink.ok === goodLink.ok).toBe(false);
    const checkpoint = await store.getCheckpoint(PORTABLE_REVOCATION_TEST_ISSUER_ID);
    expect(checkpoint?.highest_sequence).toBe(2);
    expect(checkpoint?.last_payload_hash).toBe("f".repeat(64));
  });

  it("interrupted write leaves prior checkpoint authoritative", async () => {
    const store = await openStore();
    const dir = (store as unknown as { rootDir: string }).rootDir;
    const checkpointPath = join(dir, `${issuerKey()}.checkpoint.json`);
    await store.compareAndAdvanceCheckpoint({
      revocation_issuer_id: PORTABLE_REVOCATION_TEST_ISSUER_ID,
      highest_sequence: 1,
      last_payload_hash: "1".repeat(64),
      updated_at: new Date().toISOString(),
      previous_snapshot_hash: null,
      bootstrapped: true,
    });
    await writeFile(checkpointPath, "{ incomplete", "utf8");
    const corruptRead = await store.compareAndAdvanceCheckpoint({
      revocation_issuer_id: PORTABLE_REVOCATION_TEST_ISSUER_ID,
      highest_sequence: 2,
      last_payload_hash: "2".repeat(64),
      updated_at: new Date().toISOString(),
      previous_snapshot_hash: "1".repeat(64),
      bootstrapped: false,
    });
    expect(corruptRead.ok).toBe(false);
    expect(corruptRead.code).toBe("corrupt_checkpoint");
  });
});
