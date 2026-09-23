import { keccak256, stringToBytes } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { isHex } from "viem";
import nacl from "tweetnacl";
import { bytesToHex } from "@/lib/partner/chainAttestation/solanaMessage";
import { EVM_ATTESTATION_KEY_ENV, EVM_ATTESTATION_KEY_ID_ENV, RECEIPT_SIGNING_KEY_ENVS } from "@/lib/partner/chainAttestation/signer";
import { SOLANA_ATTESTATION_KEY_ENV, SOLANA_ATTESTATION_KEY_ID_ENV } from "@/lib/partner/chainAttestation/solanaSigner";
import {
  CHAIN_ATTESTATION_SIGNER_ALGORITHMS,
  CHAIN_ATTESTATION_SIGNER_ENVIRONMENTS,
  CHAIN_ATTESTATION_SIGNER_REASONS,
  CHAIN_ATTESTATION_SIGNER_REGISTRY_ENV,
  CHAIN_ATTESTATION_SIGNER_STATUSES,
  type ChainAttestationSignerAlgorithm,
  type ChainAttestationSignerEnvironment,
  type ChainAttestationSignerReasonClass,
  type ChainAttestationSignerRecord,
  type ChainAttestationSignerStatus,
} from "./contract";
import { fingerprintPublicVerifier } from "./safety";

export type SignerRegistryLoad =
  | { ok: true; keys: ChainAttestationSignerRecord[]; environment: ChainAttestationSignerEnvironment }
  | { ok: false; reason: "unavailable" | "inconsistent" };

const IMPLICIT_START = "2020-01-01T00:00:00.000Z";
const IMPLICIT_END = "2099-01-01T00:00:00.000Z";

function isAlgo(value: unknown): value is ChainAttestationSignerAlgorithm {
  return typeof value === "string" && (CHAIN_ATTESTATION_SIGNER_ALGORITHMS as readonly string[]).includes(value);
}
function isEnv(value: unknown): value is ChainAttestationSignerEnvironment {
  return typeof value === "string" && (CHAIN_ATTESTATION_SIGNER_ENVIRONMENTS as readonly string[]).includes(value);
}
function isStatus(value: unknown): value is ChainAttestationSignerStatus {
  return typeof value === "string" && (CHAIN_ATTESTATION_SIGNER_STATUSES as readonly string[]).includes(value);
}
function isReason(value: unknown): value is ChainAttestationSignerReasonClass {
  return typeof value === "string" && (CHAIN_ATTESTATION_SIGNER_REASONS as readonly string[]).includes(value);
}

function runtimeEnvironment(env: Record<string, string | undefined>): ChainAttestationSignerEnvironment | null {
  const runtime = env.ABRAXAS_RUNTIME_ENV?.trim();
  const explicit = env.ABRAXAS_RUNTIME_ENVIRONMENT?.trim();
  const expected = runtime === "demo" ? "sandbox" : runtime === "production" ? "production" : null;
  if (explicit && explicit !== "sandbox" && explicit !== "production") return null;
  if (expected && explicit && expected !== explicit) return null;
  if (expected) return expected;
  if (explicit === "sandbox" || explicit === "production") return explicit;
  return env.NODE_ENV === "production" ? "production" : "sandbox";
}

function parseHexSecret(raw: string): Uint8Array | null {
  const hex = raw.startsWith("0x") ? raw.slice(2) : raw;
  if (!/^[0-9a-fA-F]+$/.test(hex) || (hex.length !== 64 && hex.length !== 128)) return null;
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i += 1) bytes[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return bytes;
}

function implicitEvm(env: Record<string, string | undefined>, environment: ChainAttestationSignerEnvironment): ChainAttestationSignerRecord | null {
  const raw = env[EVM_ATTESTATION_KEY_ENV]?.trim() ?? "";
  const keyId = env[EVM_ATTESTATION_KEY_ID_ENV]?.trim() ?? "";
  if (!raw || !keyId) return null;
  if (RECEIPT_SIGNING_KEY_ENVS.some((name) => env[name]?.trim() && env[name]?.trim() === raw)) return null;
  const hex = raw.startsWith("0x") ? raw : `0x${raw}`;
  if (!isHex(hex) || hex.length !== 66) return null;
  try {
    const address = privateKeyToAccount(hex as `0x${string}`).address.toLowerCase();
    return {
      signer_ref: `cas_${keccak256(stringToBytes(keyId)).slice(2, 18)}`,
      key_id: keyId,
      algorithm: "secp256k1",
      environment,
      public_verifier: address,
      fingerprint: fingerprintPublicVerifier(address),
      allowed_networks: ["evm_sandbox", "evm_sepolia", "evm_mainnet"],
      allowed_gate_types: ["evm"],
      schema_versions: ["1", "2"],
      status: "active",
      reason_class: "active",
      issued_at: IMPLICIT_START,
      not_before: IMPLICIT_START,
      expires_at: IMPLICIT_END,
      allow_historical_verification: false,
      historical_verify_until: null,
    };
  } catch {
    return null;
  }
}

function implicitSolana(env: Record<string, string | undefined>, environment: ChainAttestationSignerEnvironment): ChainAttestationSignerRecord | null {
  const raw = env[SOLANA_ATTESTATION_KEY_ENV]?.trim() ?? "";
  const keyId = env[SOLANA_ATTESTATION_KEY_ID_ENV]?.trim() ?? "";
  if (!raw || !keyId) return null;
  if (RECEIPT_SIGNING_KEY_ENVS.some((name) => env[name]?.trim() && env[name]?.trim() === raw)) return null;
  const secret = parseHexSecret(raw);
  if (!secret) return null;
  try {
    const pair = secret.length === 64
      ? nacl.sign.keyPair.fromSecretKey(secret)
      : nacl.sign.keyPair.fromSeed(secret.slice(0, 32));
    const verifier = bytesToHex(pair.publicKey);
    return {
      signer_ref: `cas_${keccak256(stringToBytes(keyId)).slice(2, 18)}`,
      key_id: keyId,
      algorithm: "ed25519",
      environment,
      public_verifier: verifier,
      fingerprint: fingerprintPublicVerifier(verifier),
      allowed_networks: ["solana_devnet", "solana_mainnet"],
      allowed_gate_types: ["solana"],
      schema_versions: ["1", "2"],
      status: "active",
      reason_class: "active",
      issued_at: IMPLICIT_START,
      not_before: IMPLICIT_START,
      expires_at: IMPLICIT_END,
      allow_historical_verification: false,
      historical_verify_until: null,
    };
  } catch {
    return null;
  }
}

function parseEntry(raw: unknown, fallback: ChainAttestationSignerEnvironment): ChainAttestationSignerRecord | "inconsistent" {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return "inconsistent";
  const row = raw as Record<string, unknown>;
  if ("private_key" in row || "d" in row || "seed" in row) return "inconsistent";
  const keyId = typeof row.key_id === "string" ? row.key_id.trim() : "";
  if (!keyId || !isAlgo(row.algorithm)) return "inconsistent";
  const publicVerifier = typeof row.public_verifier === "string" ? row.public_verifier.trim() : "";
  if (!publicVerifier) return "inconsistent";
  const networks = Array.isArray(row.allowed_networks)
    ? row.allowed_networks.filter((item): item is string => typeof item === "string")
    : [];
  const gates = Array.isArray(row.allowed_gate_types)
    ? row.allowed_gate_types.filter((item): item is "evm" | "solana" => item === "evm" || item === "solana")
    : [];
  const schemas = Array.isArray(row.schema_versions)
    ? row.schema_versions.filter((item): item is string => typeof item === "string")
    : ["1"];
  if (networks.length === 0 || gates.length === 0 || schemas.length === 0) return "inconsistent";
  const status = isStatus(row.status) ? row.status : "active";
  return {
    signer_ref: typeof row.signer_ref === "string" ? row.signer_ref : `cas_${keyId}`,
    key_id: keyId,
    algorithm: row.algorithm,
    environment: isEnv(row.environment) ? row.environment : fallback,
    public_verifier: publicVerifier,
    fingerprint: fingerprintPublicVerifier(publicVerifier),
    allowed_networks: networks,
    allowed_gate_types: gates,
    schema_versions: schemas,
    status,
    reason_class: isReason(row.reason_class) ? row.reason_class : status === "revoked" ? "compromise" : status === "active" ? "active" : "rotation",
    issued_at: typeof row.issued_at === "string" ? row.issued_at : IMPLICIT_START,
    not_before: typeof row.not_before === "string" ? row.not_before : IMPLICIT_START,
    expires_at: row.expires_at == null ? null : String(row.expires_at),
    allow_historical_verification: typeof row.allow_historical_verification === "boolean"
      ? row.allow_historical_verification
      : status === "retiring" || status === "retired",
    historical_verify_until: row.historical_verify_until == null ? null : String(row.historical_verify_until),
  };
}

export function loadChainAttestationSignerRegistry(
  env: Record<string, string | undefined> = process.env,
): SignerRegistryLoad {
  const environment = runtimeEnvironment(env);
  if (!environment) return { ok: false, reason: "inconsistent" };
  const implicits = [implicitEvm(env, environment), implicitSolana(env, environment)].filter(
    (row): row is ChainAttestationSignerRecord => Boolean(row),
  );
  const raw = env[CHAIN_ATTESTATION_SIGNER_REGISTRY_ENV]?.trim();
  if (!raw) {
    if (implicits.length === 0) return { ok: false, reason: "unavailable" };
    return { ok: true, keys: implicits, environment };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, reason: "inconsistent" };
  }
  const rows = Array.isArray(parsed) ? parsed : [parsed];
  const keys: ChainAttestationSignerRecord[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    const entry = parseEntry(row, environment);
    if (entry === "inconsistent") return { ok: false, reason: "inconsistent" };
    const dedupe = `${entry.environment}:${entry.algorithm}:${entry.key_id}`;
    if (seen.has(dedupe)) return { ok: false, reason: "inconsistent" };
    seen.add(dedupe);
    keys.push(entry);
  }
  for (const implicit of implicits) {
    const listed = keys.find((key) => key.key_id === implicit.key_id && key.algorithm === implicit.algorithm);
    if (!listed) keys.push(implicit);
    else if (listed.status === "active" && listed.fingerprint !== implicit.fingerprint) {
      return { ok: false, reason: "inconsistent" };
    }
  }
  if (keys.length === 0) return { ok: false, reason: "unavailable" };
  return { ok: true, keys, environment };
}
