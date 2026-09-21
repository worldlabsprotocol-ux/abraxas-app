import { isAddress } from "viem";
import {
  EVM_DEPLOYMENT_MANIFEST_FIELDS,
  ONCHAIN_GATE_FORBIDDEN_KEYS,
  ONCHAIN_GATE_SUBJECT_MODES,
  SOLANA_DEPLOYMENT_MANIFEST_FIELDS,
  type OnchainGateSafeReason,
} from "./contract";
import type { EvmDeploymentManifest, OnchainDeploymentManifest, SolanaDeploymentManifest } from "./types";

function isBytes32(value: unknown): value is `0x${string}` {
  return typeof value === "string" && /^0x[0-9a-f]{64}$/.test(value);
}

function isBase58Pubkey(value: unknown): value is string {
  return typeof value === "string" && /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(value);
}

export function onchainGatePayloadLeaks(payload: unknown): string[] {
  const blob = JSON.stringify(payload ?? null).toLowerCase();
  return ONCHAIN_GATE_FORBIDDEN_KEYS.filter((key) => {
    if (key === "live") return blob.includes("\"live\":true");
    if (key === "circle") return /"circle"\s*:/.test(blob);
    return blob.includes(`"${key}"`);
  });
}

export function parseOnchainDeploymentManifest(
  raw: unknown,
): { ok: true; manifest: OnchainDeploymentManifest } | { ok: false; reason: OnchainGateSafeReason } {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { ok: false, reason: "invalid" };
  const body = raw as Record<string, unknown>;
  for (const key of ONCHAIN_GATE_FORBIDDEN_KEYS) {
    if (key in body) return { ok: false, reason: "forbidden_field" };
  }
  if (body.schema_version !== 1) return { ok: false, reason: "invalid" };
  const gateType = body.gate_type;
  if (gateType !== "evm" && gateType !== "solana") return { ok: false, reason: "unsupported_gate" };
  const allowed = gateType === "evm" ? EVM_DEPLOYMENT_MANIFEST_FIELDS : SOLANA_DEPLOYMENT_MANIFEST_FIELDS;
  if (Object.keys(body).some((key) => !(allowed as readonly string[]).includes(key))) {
    return { ok: false, reason: "unknown_field" };
  }
  const networkId = typeof body.network_id === "string" ? body.network_id.trim() : "";
  const actionType = typeof body.action_type === "string" ? body.action_type.trim() : "";
  const actionScope = typeof body.action_scope === "string" ? body.action_scope.trim() : "";
  const signerKeyId = typeof body.signer_key_id === "string" ? body.signer_key_id.trim() : "";
  const environment = body.environment;
  const subject = body.subject_binding_mode;
  if (!networkId || !actionType || !actionScope || !signerKeyId) return { ok: false, reason: "invalid" };
  if (environment !== "sandbox" && environment !== "production") return { ok: false, reason: "invalid" };
  if (!(ONCHAIN_GATE_SUBJECT_MODES as readonly string[]).includes(String(subject))) {
    return { ok: false, reason: "invalid" };
  }
  if (!isBytes32(body.partner_hash) || !isBytes32(body.policy_hash) || !isBytes32(body.action_hash) || !isBytes32(body.config_digest)) {
    return { ok: false, reason: "invalid" };
  }

  if (gateType === "evm") {
    const chainId = body.chain_id;
    if (typeof chainId !== "number" || !Number.isInteger(chainId) || chainId <= 0) return { ok: false, reason: "invalid" };
    if (typeof body.gate_address !== "string" || !isAddress(body.gate_address)) return { ok: false, reason: "invalid" };
    if (!isBytes32(body.bytecode_hash)) return { ok: false, reason: "invalid" };
    const manifest: EvmDeploymentManifest = {
      schema_version: 1,
      gate_type: "evm",
      network_id: networkId,
      chain_id: chainId,
      gate_address: body.gate_address.toLowerCase() as `0x${string}`,
      bytecode_hash: body.bytecode_hash.toLowerCase() as `0x${string}`,
      config_digest: body.config_digest.toLowerCase() as `0x${string}`,
      partner_hash: body.partner_hash.toLowerCase() as `0x${string}`,
      policy_hash: body.policy_hash.toLowerCase() as `0x${string}`,
      action_hash: body.action_hash.toLowerCase() as `0x${string}`,
      action_type: actionType,
      action_scope: actionScope,
      environment,
      signer_key_id: signerKeyId,
      subject_binding_mode: subject as EvmDeploymentManifest["subject_binding_mode"],
    };
    if (onchainGatePayloadLeaks(manifest).length) return { ok: false, reason: "invalid" };
    return { ok: true, manifest };
  }

  if (!isBase58Pubkey(body.program_id) || !isBase58Pubkey(body.gate_config_pda)) return { ok: false, reason: "invalid" };
  if (!isBytes32(body.program_digest)) return { ok: false, reason: "invalid" };
  const manifest: SolanaDeploymentManifest = {
    schema_version: 1,
    gate_type: "solana",
    network_id: networkId,
    program_id: body.program_id,
    gate_config_pda: body.gate_config_pda,
    program_digest: body.program_digest.toLowerCase() as `0x${string}`,
    config_digest: body.config_digest.toLowerCase() as `0x${string}`,
    partner_hash: body.partner_hash.toLowerCase() as `0x${string}`,
    policy_hash: body.policy_hash.toLowerCase() as `0x${string}`,
    action_hash: body.action_hash.toLowerCase() as `0x${string}`,
    action_type: actionType,
    action_scope: actionScope,
    environment,
    signer_key_id: signerKeyId,
    subject_binding_mode: subject as SolanaDeploymentManifest["subject_binding_mode"],
  };
  if (onchainGatePayloadLeaks(manifest).length) return { ok: false, reason: "invalid" };
  return { ok: true, manifest };
}
