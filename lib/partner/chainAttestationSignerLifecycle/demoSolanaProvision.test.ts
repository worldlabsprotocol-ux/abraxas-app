import { describe, expect, it } from "vitest";
import { chmodSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { checkDemoSolanaSignerDocument, prepareDemoSolanaSigner, provisionDemoSolanaSigner, writeDemoSolanaSignerFile } from "./demoSolanaProvision";
import { buildChainAttestationSignerDocument } from "./publicDocument";

const id = "cask_0123456789abcdef01234567";
const at = new Date("2026-09-24T00:00:00.000Z");

describe("DEMO Solana attestation signer provisioning", () => {
  it("creates a sandbox/devnet/V2 signer that the runtime publishes", () => {
    const prepared = prepareDemoSolanaSigner(new Uint8Array(32).fill(7), at, id);
    const doc = buildChainAttestationSignerDocument({ algorithm: "ed25519", env: prepared.env });
    expect("keys" in doc).toBe(true);
    expect(checkDemoSolanaSignerDocument(doc, prepared.public, at.getTime() + 1000)).toBeNull();
    expect(JSON.stringify(doc)).not.toContain(prepared.env.ABRAXAS_SOLANA_ATTESTATION_PRIVATE_KEY);
    expect(JSON.stringify(prepared.public)).not.toContain(prepared.env.ABRAXAS_SOLANA_ATTESTATION_PRIVATE_KEY);
    expect(JSON.parse(prepared.env.ABRAXAS_CHAIN_ATTESTATION_SIGNER_REGISTRY)[0].allowed_networks).toEqual(["solana_devnet"]);
  });

  it("fails closed for modified verifier, status, scope, and validity", () => {
    const prepared = prepareDemoSolanaSigner(new Uint8Array(32).fill(8), at, id);
    const doc = buildChainAttestationSignerDocument({ algorithm: "ed25519", env: prepared.env });
    if (!("keys" in doc)) throw new Error("fixture_failed");
    expect(checkDemoSolanaSignerDocument(doc, prepared.public, at.getTime() - 1)).toBe("outside_validity_window");
    expect(checkDemoSolanaSignerDocument(doc, prepared.public, at.getTime() + 91 * 86400000)).toBe("outside_validity_window");
    expect(checkDemoSolanaSignerDocument({ ...doc, keys: [{ ...doc.keys[0], status: "revoked" }] }, prepared.public, at.getTime() + 1)).toBe("inactive");
    expect(checkDemoSolanaSignerDocument({ ...doc, keys: [{ ...doc.keys[0], public_verifier: "0x1234" }] }, prepared.public, at.getTime() + 1)).toBe("verifier_mismatch");
    expect(checkDemoSolanaSignerDocument({ ...doc, keys: [{ ...doc.keys[0], schema_versions: ["1"] }] }, prepared.public, at.getTime() + 1)).toBe("schema_mismatch");
    expect(checkDemoSolanaSignerDocument({ ...doc, keys: [{ ...doc.keys[0], allowed_networks: ["solana_mainnet"] }] }, prepared.public, at.getTime() + 1)).toBe("network_mismatch");
  });

  it("refuses generation in automated test runtime and repo paths", () => {
    expect(() => provisionDemoSolanaSigner("/tmp/signer.json", { NODE_ENV: "test" })).toThrow("interactive_local_only");
    expect(() => writeDemoSolanaSignerFile("relative.json", "{}" )).toThrow("absolute_json_path_required");
  });

  it.skipIf(process.platform === "win32")("writes once to a private directory without overwriting", () => {
    const directory = mkdtempSync(join(tmpdir(), "abraxas-signer-"));
    const path = join(directory, "operator.json");
    try {
      chmodSync(directory, 0o700);
      writeDemoSolanaSignerFile(path, "first");
      expect(() => writeDemoSolanaSignerFile(path, "second")).toThrow();
      expect(readFileSync(path, "utf8")).toBe("first");
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
