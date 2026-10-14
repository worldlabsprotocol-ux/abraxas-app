import { describe, expect, it } from "vitest";
import { decryptBackupCiphertext, encryptBackupPlaintext, parseBackupEncryptionKey } from "./encryption";
import { hashIntegrity, hashInventory } from "./fingerprints";
import { assertDisposableRestoreTarget } from "./guard";
import { pruneBackupArtifacts } from "./retention";
import { mkdtempSync, writeFileSync, existsSync, rmSync, utimesSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

describe("databaseRecovery encryption", () => {
  it("round-trips AES-256-GCM payloads", () => {
    const key = parseBackupEncryptionKey(Buffer.alloc(32, 7).toString("base64"));
    const plain = Buffer.from("pg_dump_custom_format_simulation");
    const enc = encryptBackupPlaintext(plain, key);
    const dec = decryptBackupCiphertext(enc, key);
    expect(dec.equals(plain)).toBe(true);
  });

  it("rejects invalid key length", () => {
    expect(() => parseBackupEncryptionKey("tooshort")).toThrow();
  });
});

describe("databaseRecovery restore guard", () => {
  it("allows localhost restore targets", () => {
    expect(() => assertDisposableRestoreTarget("postgresql://postgres:pw@localhost:5432/postgres")).not.toThrow();
  });

  it("blocks Supabase restore targets", () => {
    expect(() =>
      assertDisposableRestoreTarget("postgresql://postgres:pw@db.ocntwbxarpjeixdnzide.supabase.co:5432/postgres"),
    ).toThrow(/must not target Supabase/);
  });

  it("blocks production refs in restore URL", () => {
    expect(() =>
      assertDisposableRestoreTarget("postgresql://postgres:bztwutzprwsdrtqdpymf@localhost:5432/postgres"),
    ).toThrow();
  });
});

describe("databaseRecovery retention", () => {
  it("prunes older encrypted backups", () => {
    const dir = mkdtempSync(join(tmpdir(), "abraxas-retention-"));
    try {
      const a = join(dir, "a.dump.enc");
      const b = join(dir, "b.dump.enc");
      writeFileSync(a, "1");
      writeFileSync(`${a}.manifest.json`, "{}");
      writeFileSync(b, "2");
      writeFileSync(`${b}.manifest.json`, "{}");
      const past = Date.now() - 60_000;
      utimesSync(a, past / 1000, past / 1000);
      const removed = pruneBackupArtifacts(dir, 1);
      expect(removed.length).toBeGreaterThanOrEqual(2);
      expect(existsSync(b)).toBe(true);
      expect(existsSync(a)).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("databaseRecovery fingerprints", () => {
  it("hashes inventory deterministically", () => {
    const a = hashInventory([{ label: "a", n: "1" }, { label: "b", n: "2" }]);
    const b = hashInventory([{ label: "b", n: "2" }, { label: "a", n: "1" }]);
    expect(a).toBe(b);
  });

  it("hashes integrity bundle", () => {
    const h = hashIntegrity({
      idv_aggregate: "abc",
      subjects_aggregate: "def",
      wallets_aggregate: "ghi",
    });
    expect(h).toMatch(/^[a-f0-9]{64}$/);
  });
});
