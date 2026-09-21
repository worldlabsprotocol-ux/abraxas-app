import { keccak256, stringToBytes } from "viem";
import { hashesForApplication } from "@/lib/partner/onchainGateDeployments/digests";
import { hashUtf8 } from "@/lib/partner/chainAttestation/hashes";
import { LOCALNET_SOLANA_PROGRAM_IDS, TESTNET_GATE_KIT_VERSION } from "./contract";
import {
  institutionalBytecodeDigest,
  institutionalConfigDigest,
  institutionalSolanaLayout,
  solanaInstitutionalProgramIsV1Only,
} from "./institutional";
import { INSTITUTIONAL_ATTESTATION_ONLY_FIELDS } from "./types";
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
  const extra = input.bindings ?? {};
  const bindings: KitBindings = {
    ...DEFAULT_BINDINGS,
    partner_id: extra.partner_id || DEFAULT_BINDINGS.partner_id,
    application_id: extra.application_id || DEFAULT_BINDINGS.application_id,
    policy_id: extra.policy_id || DEFAULT_BINDINGS.policy_id,
    policy_version: extra.policy_version ?? DEFAULT_BINDINGS.policy_version,
    signer_key_id: extra.signer_key_id || DEFAULT_BINDINGS.signer_key_id,
    subject_binding_mode: extra.subject_binding_mode ?? DEFAULT_BINDINGS.subject_binding_mode,
  };
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
    institutional: null,
    solana_v2: null,
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

export function planInstitutionalTestnetGate(input: {
  target: "institutional-evm-sepolia" | "institutional-solana-devnet";
  bindings?: Partial<KitBindings>;
  publicVerifier?: string;
  now?: string;
}): { ok: true; envelope: TestnetGateKitEnvelope } | { ok: false; reason: string } {
  const net = approvedHumanTestnet(input.target);
  if (!net.ok) return net;
  const planned = planTestnetGate({
    target: net.gate_type === "evm" ? "evm" : "solana",
    bindings: input.bindings,
    now: input.now,
  });
  if (!planned.ok) return planned;
  const rawVerifier = (input.publicVerifier ?? "").trim() || "unspecified";
  const publicVerifier = rawVerifier === "unspecified" || /^0x[0-9a-fA-F]{64}$/.test(rawVerifier)
    ? rawVerifier
    : hashUtf8(rawVerifier);
  const institutional = {
    schema_version: "2" as const,
    institutional_required: true as const,
    require_institutional: true as const,
    signer_key_id: planned.envelope.bindings.signer_key_id,
    public_verifier: publicVerifier,
    partner_hash: planned.envelope.partner_hash,
    policy_hash: planned.envelope.policy_hash,
    action_hash: planned.envelope.action_hash,
    environment_hash: planned.envelope.environment_hash,
    config_digest: institutionalConfigDigest({
      gateType: net.gate_type,
      networkId: net.network_id,
      chainId: net.chain_id,
      partnerHash: planned.envelope.partner_hash,
      policyHash: planned.envelope.policy_hash,
      actionHash: planned.envelope.action_hash,
      environmentHash: planned.envelope.environment_hash,
      signerKeyId: planned.envelope.bindings.signer_key_id,
      publicVerifier,
    }),
    bytecode_digest: institutionalBytecodeDigest(net.gate_type),
    consumer: "expiry_bound_protocol_access" as const,
    attestation_only_fields: INSTITUTIONAL_ATTESTATION_ONLY_FIELDS,
  };
  const solanaV2 = net.gate_type === "solana" ? institutionalSolanaLayout() : null;
  if (solanaV2 && solanaInstitutionalProgramIsV1Only(solanaV2)) {
    return { ok: false, reason: "institutional_required" };
  }
  const envelope: TestnetGateKitEnvelope = {
    ...planned.envelope,
    kit_schema_version: 2,
    eip712: planned.envelope.eip712
      ? { ...planned.envelope.eip712, version: "2" }
      : null,
    institutional,
    solana_v2: solanaV2,
    kit_digest: kitDigest([
      "institutional-v2",
      net.network_id,
      String(net.chain_id ?? ""),
      planned.envelope.bindings.partner_id,
      planned.envelope.bindings.policy_id,
      String(planned.envelope.bindings.policy_version),
      planned.envelope.bindings.signer_key_id,
      institutional.config_digest,
      planned.envelope.planned_at,
    ]),
  };
  return { ok: true, envelope };
}
