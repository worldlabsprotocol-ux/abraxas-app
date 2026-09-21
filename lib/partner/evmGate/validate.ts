// Fail-closed serialization and validation for EVM gate manifests.

import { isAddress, isHex, keccak256 } from "viem";
import { getNetworkCapability } from "@/lib/partner/networkCapability/registry";
import { networkAllowsEvmGateManifest } from "./networks";
import {
  EVM_GATE_MANIFEST_FIELDS,
  EVM_GATE_MANIFEST_FORBIDDEN_KEYS,
  EVM_GATE_MANIFEST_SCHEMA_VERSION,
  EVM_GATE_MANIFEST_STATUSES,
  type EvmGateDeploymentManifest,
  type EvmGateManifestStatus,
} from "./manifest";

export function evmGatePayloadLeaks(payload: unknown): string[] {
  const blob = JSON.stringify(payload ?? null).toLowerCase();
  return EVM_GATE_MANIFEST_FORBIDDEN_KEYS.filter((key) => {
    if (key === "live" && blob.includes("\"live\":true")) return true;
    if (key === "live") return false;
    return blob.includes(key);
  });
}

export function hashEvmGateBytecode(bytecode: `0x${string}`): `0x${string}` {
  if (!isHex(bytecode) || bytecode.length < 10) throw new Error("invalid_bytecode");
  return keccak256(bytecode);
}

function isBytes32(value: unknown): value is `0x${string}` {
  return typeof value === "string" && /^0x[0-9a-fA-F]{64}$/.test(value);
}

export function projectEvmGateManifest(input: EvmGateDeploymentManifest): EvmGateDeploymentManifest {
  return {
    schema_version: input.schema_version,
    status: input.status,
    network_id: input.network_id,
    chain_id: input.chain_id,
    gate_address: input.gate_address,
    bytecode_hash: input.bytecode_hash,
    partner_hash: input.partner_hash,
    policy_hash: input.policy_hash,
    action_hash: input.action_hash,
    environment: input.environment,
    signer_key_id: input.signer_key_id,
    require_subject: input.require_subject,
    create2_salt: input.create2_salt,
    predicted_address: input.predicted_address,
  };
}

export function validateEvmGateManifest(raw: unknown):
  | { ok: true; manifest: EvmGateDeploymentManifest }
  | { ok: false; reason: string } {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { ok: false, reason: "invalid" };
  const body = raw as Record<string, unknown>;
  const extra = Object.keys(body).filter((key) => !(EVM_GATE_MANIFEST_FIELDS as readonly string[]).includes(key));
  if (extra.length > 0) return { ok: false, reason: "unknown_field" };
  for (const key of EVM_GATE_MANIFEST_FORBIDDEN_KEYS) {
    if (key in body) return { ok: false, reason: "forbidden_field" };
  }
  if (body.schema_version !== EVM_GATE_MANIFEST_SCHEMA_VERSION) return { ok: false, reason: "invalid" };
  if (!(EVM_GATE_MANIFEST_STATUSES as readonly string[]).includes(String(body.status))) {
    return { ok: false, reason: "invalid_status" };
  }
  if (body.status === "live") return { ok: false, reason: "invalid_status" };
  const networkId = typeof body.network_id === "string" ? body.network_id : "";
  const chainId = typeof body.chain_id === "number" && Number.isInteger(body.chain_id) ? body.chain_id : NaN;
  if (!getNetworkCapability(networkId)) return { ok: false, reason: "network_disabled" };
  if (body.status === "local_test") {
    if (networkId !== "evm_sandbox" || chainId !== 31337) return { ok: false, reason: "network_disabled" };
  } else if (getNetworkCapability(networkId)?.status === "disabled") {
    return { ok: false, reason: "network_disabled" };
  } else if (getNetworkCapability(networkId)?.status === "production_review_required") {
    if (!Number.isInteger(chainId) || chainId <= 0) return { ok: false, reason: "invalid" };
  } else if (!networkAllowsEvmGateManifest(networkId, chainId)) {
    return { ok: false, reason: "network_disabled" };
  }
  if (typeof body.gate_address !== "string" || !isAddress(body.gate_address)) return { ok: false, reason: "invalid" };
  if (!isBytes32(body.bytecode_hash) || !isBytes32(body.partner_hash) || !isBytes32(body.policy_hash)
    || !isBytes32(body.action_hash) || !isBytes32(body.environment)) {
    return { ok: false, reason: "invalid" };
  }
  if (typeof body.signer_key_id !== "string" || !body.signer_key_id.trim()) return { ok: false, reason: "invalid" };
  if (typeof body.require_subject !== "boolean") return { ok: false, reason: "invalid" };
  const salt = body.create2_salt == null ? null : body.create2_salt;
  const predicted = body.predicted_address == null ? null : body.predicted_address;
  if (salt !== null && !isBytes32(salt)) return { ok: false, reason: "invalid" };
  if (predicted !== null && (typeof predicted !== "string" || !isAddress(predicted))) return { ok: false, reason: "invalid" };
  const manifest = projectEvmGateManifest({
    schema_version: 1,
    status: body.status as EvmGateManifestStatus,
    network_id: networkId,
    chain_id: chainId,
    gate_address: body.gate_address as `0x${string}`,
    bytecode_hash: body.bytecode_hash,
    partner_hash: body.partner_hash,
    policy_hash: body.policy_hash,
    action_hash: body.action_hash,
    environment: body.environment,
    signer_key_id: body.signer_key_id.trim(),
    require_subject: body.require_subject,
    create2_salt: salt as `0x${string}` | null,
    predicted_address: predicted as `0x${string}` | null,
  });
  if (evmGatePayloadLeaks(manifest).length > 0) return { ok: false, reason: "invalid" };
  return { ok: true, manifest };
}

export const EVM_GATE_CLIENT_AUTHORITY_KEYS = [
  "gate_address",
  "chain_id",
  "signer",
  "trusted_signer",
  "policy",
  "action",
  "manifest",
  "receipt",
  "nonce",
  "wallet",
  "deployment_status",
  "status",
] as const;

export function rejectEvmGateClientAuthority(body: unknown): boolean {
  if (!body || typeof body !== "object" || Array.isArray(body)) return false;
  return Object.keys(body as Record<string, unknown>).some((key) =>
    (EVM_GATE_CLIENT_AUTHORITY_KEYS as readonly string[]).includes(key),
  );
}
