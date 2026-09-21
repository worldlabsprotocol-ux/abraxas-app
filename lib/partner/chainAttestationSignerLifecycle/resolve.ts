import type { ChainAttestationSignerRecord, ChainAttestationSignerResolveReason } from "./contract";
import { loadChainAttestationSignerRegistry } from "./registry";
import { fingerprintPublicVerifier } from "./safety";
import { loadEvmAttestationSigner } from "@/lib/partner/chainAttestation/signer";
import { loadSolanaAttestationSigner } from "@/lib/partner/chainAttestation/solanaSigner";
import { bytesToHex } from "@/lib/partner/chainAttestation/solanaMessage";

function inWindow(key: ChainAttestationSignerRecord, now: Date, mode: "issue" | "verify"): ChainAttestationSignerResolveReason {
  const nowMs = now.getTime();
  const notBefore = Date.parse(key.not_before);
  if (Number.isNaN(notBefore) || nowMs < notBefore) return "not_yet_valid";
  if (key.status === "revoked") return "revoked";
  if (mode === "issue") {
    if (key.status !== "active") return key.status === "retired" || key.status === "retiring" ? "expired" : "revoked";
    if (key.expires_at) {
      const expires = Date.parse(key.expires_at);
      if (Number.isNaN(expires) || nowMs >= expires) return "expired";
    }
    return "ok";
  }
  if (key.status === "active") {
    if (key.expires_at) {
      const expires = Date.parse(key.expires_at);
      if (Number.isNaN(expires) || nowMs >= expires) return "expired";
    }
    return "ok";
  }
  if (key.status === "retiring" || key.status === "retired") {
    if (!key.allow_historical_verification) return "historical_not_allowed";
    if (key.historical_verify_until) {
      const until = Date.parse(key.historical_verify_until);
      if (Number.isNaN(until) || nowMs >= until) return "expired";
    }
    return "ok";
  }
  return "revoked";
}

function matchesScope(
  key: ChainAttestationSignerRecord,
  input: { environment: string; networkId: string; gateType: "evm" | "solana"; schemaVersion: string },
): ChainAttestationSignerResolveReason | null {
  if (key.environment !== input.environment) return "wrong_environment";
  if (!key.allowed_networks.includes(input.networkId)) return "wrong_network";
  if (!key.allowed_gate_types.includes(input.gateType)) return "unsupported_gate";
  if (!key.schema_versions.includes(input.schemaVersion)) return "schema_mismatch";
  return null;
}

export function resolveChainAttestationVerificationSigner(input: {
  keyId: string;
  algorithm: "secp256k1" | "ed25519";
  environment: "sandbox" | "production";
  networkId: string;
  gateType: "evm" | "solana";
  schemaVersion: string;
  now?: Date;
  env?: Record<string, string | undefined>;
}): { ok: true; key: ChainAttestationSignerRecord } | { ok: false; reason: ChainAttestationSignerResolveReason } {
  const loaded = loadChainAttestationSignerRegistry(input.env ?? process.env);
  if (!loaded.ok) return { ok: false, reason: loaded.reason };
  const key = loaded.keys.find((row) => row.key_id === input.keyId && row.algorithm === input.algorithm);
  if (!key) return { ok: false, reason: "unknown_key" };
  const scoped = matchesScope(key, input);
  if (scoped) return { ok: false, reason: scoped };
  const windowReason = inWindow(key, input.now ?? new Date(), "verify");
  if (windowReason !== "ok") return { ok: false, reason: windowReason };
  return { ok: true, key };
}

export function resolveChainAttestationIssuanceSigner(input: {
  algorithm: "secp256k1" | "ed25519";
  environment: "sandbox" | "production";
  networkId: string;
  gateType: "evm" | "solana";
  schemaVersion: string;
  now?: Date;
  env?: Record<string, string | undefined>;
}): { ok: true; key: ChainAttestationSignerRecord } | { ok: false; reason: ChainAttestationSignerResolveReason } {
  const env = input.env ?? process.env;
  const loaded = loadChainAttestationSignerRegistry(env);
  if (!loaded.ok) return { ok: false, reason: loaded.reason };
  if (input.algorithm === "secp256k1") {
    const signer = loadEvmAttestationSigner();
    if (!signer.ok) return { ok: false, reason: "unavailable" };
    const key = loaded.keys.find((row) => row.key_id === signer.signer.keyId && row.algorithm === "secp256k1");
    if (!key) return { ok: false, reason: "unknown_key" };
    if (key.fingerprint !== fingerprintPublicVerifier(signer.signer.address)) return { ok: false, reason: "inconsistent" };
    const scoped = matchesScope(key, input);
    if (scoped) return { ok: false, reason: scoped };
    const windowReason = inWindow(key, input.now ?? new Date(), "issue");
    if (windowReason !== "ok") return { ok: false, reason: windowReason };
    return { ok: true, key };
  }
  const signer = loadSolanaAttestationSigner();
  if (!signer.ok) return { ok: false, reason: "unavailable" };
  const key = loaded.keys.find((row) => row.key_id === signer.signer.keyId && row.algorithm === "ed25519");
  if (!key) return { ok: false, reason: "unknown_key" };
  if (key.fingerprint !== fingerprintPublicVerifier(bytesToHex(signer.signer.publicKey))) {
    return { ok: false, reason: "inconsistent" };
  }
  const scoped = matchesScope(key, input);
  if (scoped) return { ok: false, reason: scoped };
  const windowReason = inWindow(key, input.now ?? new Date(), "issue");
  if (windowReason !== "ok") return { ok: false, reason: windowReason };
  return { ok: true, key };
}

export function mapSignerReasonToAttestation(
  reason: ChainAttestationSignerResolveReason,
): "attestation_unavailable" | "unknown_key" | "signer_revoked" | "schema_mismatch" | "environment_mismatch" | "network_disabled" | "invalid" {
  if (reason === "unavailable" || reason === "inconsistent") return "attestation_unavailable";
  if (reason === "unknown_key") return "unknown_key";
  if (reason === "revoked") return "signer_revoked";
  if (reason === "schema_mismatch") return "schema_mismatch";
  if (reason === "wrong_environment") return "environment_mismatch";
  if (reason === "wrong_network" || reason === "unsupported_gate") return "network_disabled";
  return "invalid";
}
