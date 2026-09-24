import { randomBytes } from "node:crypto";
import { constants, lstatSync, openSync, closeSync, writeFileSync, unlinkSync } from "node:fs";
import { dirname, isAbsolute, resolve, sep } from "node:path";
import nacl from "tweetnacl";
import { bytesToHex } from "@/lib/partner/chainAttestation/solanaMessage";
import { fingerprintPublicVerifier } from "./safety";
import { buildChainAttestationSignerDocument } from "./publicDocument";
import { automatedEnvironmentForbidden } from "@/lib/partner/testnetGateDeploymentKit/deploy";

export const DEMO_SOLANA_SIGNER_URL = "https://demo.abraxasworld.xyz/api/chain-attestations/verification-keys/solana";

export function prepareDemoSolanaSigner(seed: Uint8Array, issuedAt: Date, keyId: string) {
  if (seed.length !== 32 || !/^cask_[a-f0-9]{24}$/.test(keyId) || !Number.isFinite(issuedAt.getTime())) throw new Error("invalid_input");
  const publicVerifier = bytesToHex(nacl.sign.keyPair.fromSeed(seed).publicKey);
  const issued = issuedAt.toISOString();
  const expires = new Date(issuedAt.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString();
  const registry = {
    key_id: keyId, algorithm: "ed25519", public_verifier: publicVerifier,
    environment: "sandbox", allowed_networks: ["solana_devnet"],
    allowed_gate_types: ["solana"], schema_versions: ["2"],
    status: "active", reason_class: "active", issued_at: issued,
    not_before: issued, expires_at: expires,
  };
  const env = {
    ABRAXAS_RUNTIME_ENV: "demo",
    ABRAXAS_SOLANA_ATTESTATION_PRIVATE_KEY: Buffer.from(seed).toString("hex"),
    ABRAXAS_SOLANA_ATTESTATION_SIGNER_KEY_ID: keyId,
    ABRAXAS_CHAIN_ATTESTATION_SIGNER_REGISTRY: JSON.stringify([registry]),
  };
  const document = buildChainAttestationSignerDocument({ algorithm: "ed25519", env });
  if ("ok" in document || document.keys.length !== 1) throw new Error("registry_inconsistent");
  return { env, public: { key_id: keyId, public_verifier: publicVerifier, fingerprint: fingerprintPublicVerifier(publicVerifier), expires_at: expires } };
}

export function writeDemoSolanaSignerFile(path: string, data: string): void {
  if (!isAbsolute(path) || !path.endsWith(".json")) throw new Error("absolute_json_path_required");
  const root = resolve(process.cwd());
  const target = resolve(path);
  if (target === root || target.startsWith(`${root}${sep}`)) throw new Error("repository_path_forbidden");
  const parent = lstatSync(dirname(target));
  if (!parent.isDirectory() || parent.isSymbolicLink() || (parent.mode & 0o077) !== 0) throw new Error("private_directory_required");
  let fd: number | undefined;
  try {
    fd = openSync(target, constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY | constants.O_NOFOLLOW, 0o600);
    writeFileSync(fd, data, { encoding: "utf8" });
  } catch (error) {
    if (fd !== undefined) { closeSync(fd); unlinkSync(target); fd = undefined; }
    throw error;
  } finally {
    if (fd !== undefined) closeSync(fd);
  }
}

export function provisionDemoSolanaSigner(path: string, env: NodeJS.ProcessEnv = process.env) {
  if (automatedEnvironmentForbidden(env) || !process.stdin.isTTY || !process.stdout.isTTY) throw new Error("interactive_local_only");
  if (process.platform === "win32") throw new Error("ubuntu_operator_only");
  const seed = randomBytes(32);
  try {
    const prepared = prepareDemoSolanaSigner(seed, new Date(), `cask_${randomBytes(12).toString("hex")}`);
    writeDemoSolanaSignerFile(path, `${JSON.stringify(prepared.env, null, 2)}\n`);
    return prepared.public;
  } finally { seed.fill(0); }
}

export function checkDemoSolanaSignerDocument(value: unknown, expected: { key_id: string; public_verifier: string }, now = Date.now()): string | null {
  if (!value || typeof value !== "object") return "invalid_document";
  const doc = value as Record<string, unknown>;
  if (doc.document !== "abraxas_chain_attestation_verification_keys" || doc.algorithm !== "ed25519" || doc.environment !== "sandbox" || !Array.isArray(doc.keys)) return "invalid_document";
  const key = doc.keys.find((item: unknown) => typeof item === "object" && item !== null && (item as Record<string, unknown>).key_id === expected.key_id) as Record<string, unknown> | undefined;
  if (!key) return "key_missing";
  if (key.public_verifier !== expected.public_verifier || key.fingerprint !== fingerprintPublicVerifier(expected.public_verifier)) return "verifier_mismatch";
  if (key.status !== "active" || key.environment !== "sandbox" || key.algorithm !== "ed25519") return "inactive";
  if (!Array.isArray(key.allowed_networks) || !key.allowed_networks.includes("solana_devnet") || key.allowed_networks.includes("solana_mainnet")) return "network_mismatch";
  if (!Array.isArray(key.allowed_gate_types) || !key.allowed_gate_types.includes("solana") || !Array.isArray(key.schema_versions) || !key.schema_versions.includes("2")) return "schema_mismatch";
  const start = Date.parse(String(key.not_before)); const end = Date.parse(String(key.expires_at));
  if (!Number.isFinite(start) || !Number.isFinite(end) || now < start || now >= end) return "outside_validity_window";
  return null;
}
