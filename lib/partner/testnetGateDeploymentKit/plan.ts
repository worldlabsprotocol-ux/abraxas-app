import { keccak256, stringToBytes } from "viem";
import { hashesForApplication } from "@/lib/partner/onchainGateDeployments/digests";
import { LOCALNET_SOLANA_PROGRAM_IDS, TESTNET_GATE_KIT_VERSION } from "./contract";
import { approvedHumanTestnet } from "./networks";
import type { KitBindings, TestnetGateKitEnvelope } from "./types";

const DEFAULT_BINDINGS: KitBindings = {
  partner_id: "YOUR_PARTNER_ID",
  application_id: "YOUR_APP_ID",
  policy_id: "YOUR_POLICY_ID",
  policy_version: 1,
  action_type: "activate_protocol_access",
  action_scope: "sandbox:protocol_access",
  environment: "sandbox",
  signer_key_id: "YOUR_SIGNER_KEY_ID",
  subject_binding_mode: "required",
};

export function create2Salt(bindings: KitBindings): `0x${string}` {
  return keccak256(stringToBytes(`${bindings.partner_id}:${bindings.policy_id}:${bindings.policy_version}:${bindings.action_type}`));
}

export function kitDigest(parts: string[]): `0x${string}` {
  return keccak256(stringToBytes(parts.join("|")));
}

export function planTestnetGate(input: {
  target: "solana" | "evm";
  bindings?: Partial<KitBindings>;
  now?: string;
}): { ok: true; envelope: TestnetGateKitEnvelope } | { ok: false; reason: string } {
  const net = approvedHumanTestnet(input.target);
  if (!net.ok) return net;
  const bindings: KitBindings = { ...DEFAULT_BINDINGS };
  for (const [key, value] of Object.entries(input.bindings ?? {})) {
    if (value !== undefined && value !== "") (bindings as Record<string, unknown>)[key] = value;
  }
  const hashes = hashesForApplication({
    partnerId: bindings.partner_id,
    policyId: bindings.policy_id,
    policyVersion: bindings.policy_version,
    actionType: bindings.action_type,
    actionScope: bindings.action_scope,
    environment: bindings.environment,
    signerKeyId: bindings.signer_key_id,
  });
  const plannedAt = input.now ?? "1970-01-01T00:00:00.000Z";
  const salt = create2Salt(bindings);
  const envelope: TestnetGateKitEnvelope = {
    kit_schema_version: 1,
    kit_version: TESTNET_GATE_KIT_VERSION,
    phase: "planned",
    live: false,
    deploys_from_browser: false,
    planned_at: plannedAt,
    gate_type: net.gate_type,
    network_id: net.network_id,
    chain_id: net.chain_id,
    bindings,
    partner_hash: hashes.partner_hash,
    policy_hash: hashes.policy_hash,
    action_hash: hashes.action_hash,
    environment_hash: hashes.environment_hash,
    create2: net.gate_type === "evm" ? { factory: "DeployPartnerGate", salt, predicted_gate: null } : null,
    eip712: net.gate_type === "evm"
      ? {
          name: "AbraxasEligibilityVerifier",
          version: "1",
          chain_id: net.chain_id ?? 0,
          verifying_contract: null,
          partner_hash: hashes.partner_hash,
        }
      : null,
    localnet_program_ids: net.gate_type === "solana" ? LOCALNET_SOLANA_PROGRAM_IDS : null,
    protocol_program_id: net.gate_type === "solana" ? LOCALNET_SOLANA_PROGRAM_IDS.abraxas_protocol_access : null,
    protocol_address: null,
    registry_manifest: null,
    kit_digest: kitDigest([
      net.network_id,
      String(net.chain_id ?? ""),
      bindings.partner_id,
      bindings.policy_id,
      String(bindings.policy_version),
      bindings.action_type,
      bindings.signer_key_id,
      plannedAt,
    ]),
  };
  return { ok: true, envelope };
}
