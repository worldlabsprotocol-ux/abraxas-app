import { mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  ANCHOR_KEY_ID,
  assertCustodyDirectory,
  assertVercelScopeLists,
  formatPublicSummary,
  generateProductionAuthorities,
  installProductionSecrets,
  PRIVATE_ANCHOR_FILE,
  ProductionSigningAuthorityError,
  PUBLIC_PIN_FILE,
  RECEIPT_KEY_FINGERPRINT,
  restoreCheckRecovery,
  STATUS_SIGNER_KEY_ID,
  verifyProductionAuthorities,
  verifyVercelScopes,
  writeEncryptedRecovery,
} from "./productionSigningAuthority";

const REPO = process.cwd();
const disposable = { disposableAllowed: true };
const created: string[] = [];

afterEach(() => {
  for (const dir of created.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function custodyDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "abraxas-signing-ceremony-"));
  created.push(dir);
  return dir;
}

describe("production signing authority ceremony", () => {
  it("refuses a repository path and a relative path", () => {
    expect(() => assertCustodyDirectory(REPO, REPO)).toThrow(ProductionSigningAuthorityError);
    expect(() => assertCustodyDirectory("custody", REPO)).toThrow(/absolute path/);
  });

  it("writes public fingerprints only and keeps an encrypted restorable backup", () => {
    const dir = custodyDir();
    const generated = generateProductionAuthorities(dir, REPO, disposable);
    const report = formatPublicSummary(generated);
    const privateSeed = JSON.parse(readFileSync(join(dir, PRIVATE_ANCHOR_FILE), "utf8")).d as string;

    expect(generated.anchor_key_id).toBe(ANCHOR_KEY_ID);
    expect(generated.status_signer_key_id).toBe(STATUS_SIGNER_KEY_ID);
    expect(generated.anchor_fingerprint).not.toBe(generated.status_signer_fingerprint);
    expect(generated.anchor_fingerprint).not.toBe(RECEIPT_KEY_FINGERPRINT);
    expect(generated.status_signer_fingerprint).not.toBe(RECEIPT_KEY_FINGERPRINT);
    expect(report).not.toContain(privateSeed);
    expect(readFileSync(join(dir, PUBLIC_PIN_FILE), "utf8")).not.toContain(privateSeed);
    expect(statSync(join(dir, PRIVATE_ANCHOR_FILE)).mode & 0o077).toBe(0);

    const verified = verifyProductionAuthorities(dir, REPO, disposable);
    expect(verified.anchor_fingerprint).toBe(generated.anchor_fingerprint);

    const env = { ABRAXAS_SIGNING_RECOVERY_PASSPHRASE: "test-passphrase-not-production" };
    writeEncryptedRecovery(dir, env, ["backup"], REPO, disposable);
    const restored = restoreCheckRecovery(dir, env, ["restore-check"], REPO, disposable);
    expect(restored.anchor_fingerprint).toBe(generated.anchor_fingerprint);
    expect(readFileSync(join(dir, PRIVATE_ANCHOR_FILE), "utf8")).toContain(privateSeed);
    expect(() => restoreCheckRecovery(dir, { ABRAXAS_SIGNING_RECOVERY_PASSPHRASE: "wrong-passphrase-value" }, [], REPO, disposable))
      .toThrow(/could not be decrypted/);
  });

  it("accepts production-only secret names and rejects a preview leak", () => {
    const names = [
      "ABRAXAS_ISSUER_AUTHORITY_ANCHOR_KEY_ID",
      "ABRAXAS_ISSUER_AUTHORITY_ANCHOR_PUBLIC_JWK",
      "ABRAXAS_ISSUER_AUTHORITY_ANCHOR_PRIVATE_JWK",
      "ABRAXAS_STATUS_SIGNER_KEY_ID",
      "ABRAXAS_STATUS_SIGNER_PUBLIC_JWK",
      "ABRAXAS_STATUS_SIGNER_PRIVATE_JWK",
    ];
    expect(() => assertVercelScopeLists({
      production: names.map((name) => `${name} Encrypted Production`).join("\n"),
      preview: "ABRAXAS_PUBLIC_KEY Encrypted Preview",
      demo: "",
    })).not.toThrow();
    expect(() => assertVercelScopeLists({
      production: names.map((name) => `${name} Encrypted Production`).join("\n"),
      preview: "ABRAXAS_STATUS_SIGNER_PRIVATE_JWK Encrypted Preview",
      demo: "",
    })).toThrow(/outside Production/);
  });

  it("passes install values on stdin and stops if command output contains a JWK", () => {
    const dir = custodyDir();
    generateProductionAuthorities(dir, REPO, disposable);
    const calls: { args: readonly string[]; input: string }[] = [];
    const saved = installProductionSecrets(dir, (_command, args, input) => {
      calls.push({ args, input });
      return { status: 0, stdout: "Added", stderr: "" };
    }, REPO, disposable);
    const privateCall = calls.find((call) => call.args.includes("ABRAXAS_ISSUER_AUTHORITY_ANCHOR_PRIVATE_JWK"));
    expect(saved).toHaveLength(6);
    expect(privateCall?.args).toEqual([
      "env", "add", "ABRAXAS_ISSUER_AUTHORITY_ANCHOR_PRIVATE_JWK",
      "--environment", "production", "--type", "secret", "--yes",
    ]);
    expect(privateCall?.args.join(" ")).not.toContain(privateCall?.input ?? "missing");
    expect(privateCall?.input.startsWith("{")).toBe(true);
    expect(() => installProductionSecrets(dir, () => ({ status: 0, stdout: "{\"d\":\"not-a-real-seed\"}", stderr: "" }), REPO, disposable))
      .toThrow(/private material/);
  });

  it("checks production, preview, and demo listings without json output", () => {
    const names = [
      "ABRAXAS_ISSUER_AUTHORITY_ANCHOR_KEY_ID",
      "ABRAXAS_ISSUER_AUTHORITY_ANCHOR_PUBLIC_JWK",
      "ABRAXAS_ISSUER_AUTHORITY_ANCHOR_PRIVATE_JWK",
      "ABRAXAS_STATUS_SIGNER_KEY_ID",
      "ABRAXAS_STATUS_SIGNER_PUBLIC_JWK",
      "ABRAXAS_STATUS_SIGNER_PRIVATE_JWK",
    ];
    const seen: string[][] = [];
    verifyVercelScopes((_command, args) => {
      seen.push([...args]);
      const environment = args[3];
      const stdout = environment === "production"
        ? names.map((name) => `${name} Encrypted Production`).join("\n")
        : "ABRAXAS_PUBLIC_KEY Encrypted";
      return { status: 0, stdout, stderr: "" };
    });
    expect(seen).toEqual([
      ["env", "ls", "--environment", "production"],
      ["env", "ls", "--environment", "preview"],
      ["env", "ls", "--environment", "demo"],
    ]);
  });
});
