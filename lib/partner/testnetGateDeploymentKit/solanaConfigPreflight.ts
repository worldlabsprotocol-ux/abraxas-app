import { PublicKey } from "@solana/web3.js";
import { ZERO_BYTES32 } from "@/lib/partner/chainAttestation/contract";
import { hashNetworkId } from "@/lib/partner/chainAttestation/hashes";
import { CHAIN_ATTESTATION_SIGNER_DOCUMENT } from "@/lib/partner/chainAttestationSignerLifecycle/contract";
import { assertNoPrivateAttestationSignerMaterial } from "@/lib/partner/chainAttestationSignerLifecycle/safety";
import { expectedSolanaConfigDigest, hashesForApplication } from "@/lib/partner/onchainGateDeployments/digests";
import { deriveGateConfigPda } from "@/lib/partner/onchainGateDeployments/solanaObserve";
import { SOLANA_GATE_V2_RELEASE } from "@/lib/partner/onchainGateDeployments/solanaV2Release";
import {
  SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_ACTION,
  SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_POLICY_ID,
  SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_POLICY_VERSION,
  SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_SCOPE,
} from "@/lib/partner/sandboxInstitutionalProtocolAccess/contract";
import { LOCALNET_SOLANA_PROGRAM_IDS } from "./contract";

export type DevnetConfigPreflightReason =
  | "missing_binding" | "placeholder_binding" | "invalid_admin"
  | "invalid_signer_document" | "signer_unavailable" | "signer_ineligible";

export interface DevnetConfigPreflightInput {
  partnerId: string;
  applicationId: string;
  adminPubkey: string;
  signerKeyId: string;
  signerDocument: unknown;
  now?: Date;
}

type SignerRow = {
  key_id?: unknown;
  algorithm?: unknown;
  environment?: unknown;
  status?: unknown;
  public_verifier?: unknown;
  allowed_networks?: unknown;
  allowed_gate_types?: unknown;
  schema_versions?: unknown;
  not_before?: unknown;
  expires_at?: unknown;
};
type SignerDocument = {
  document?: unknown;
  algorithm?: unknown;
  environment?: unknown;
  keys?: unknown;
};

function binding(value: string): "ok" | "missing_binding" | "placeholder_binding" {
  const trimmed = value.trim();
  if (!trimmed) return "missing_binding";
  if (/^(YOUR_|PLACEHOLDER|CHANGE_ME|TODO)/i.test(trimmed)) return "placeholder_binding";
  return "ok";
}

function verifierBytes(value: unknown): Uint8Array | null {
  if (typeof value !== "string" || !/^0x[0-9a-fA-F]{64}$/.test(value)) return null;
  const bytes = Buffer.from(value.slice(2), "hex");
  return bytes.some((byte) => byte !== 0) ? bytes : null;
}

export function planSolanaDevnetGateConfig(input: DevnetConfigPreflightInput):
  | { ok: false; reason: DevnetConfigPreflightReason }
  | { ok: true; plan: {
      network_id: "solana_devnet";
      gate_program_id: string;
      partner_program_id: string;
      admin_pubkey: string;
      gate_config_pda: string;
      policy_id: typeof SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_POLICY_ID;
      policy_version: typeof SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_POLICY_VERSION;
      action_type: typeof SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_ACTION;
      action_scope: typeof SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_SCOPE;
      environment: "sandbox";
      network_hash: `0x${string}`;
      partner_hash: `0x${string}`;
      policy_hash: `0x${string}`;
      action_hash: `0x${string}`;
      environment_hash: `0x${string}`;
      signer_key_id: string;
      signer_key_hash: `0x${string}`;
      trusted_signer: `0x${string}`;
      config_digest: `0x${string}`;
      require_subject: true;
      require_institutional: true;
      expected_organization_commitment: typeof ZERO_BYTES32;
      expected_actor_commitment: typeof ZERO_BYTES32;
      expected_institutional_result_category: typeof ZERO_BYTES32;
      signer_document_active: true;
      ownership_verified: false;
      onchain_config_observed: false;
      broadcast: false;
    } } {
  for (const value of [input.partnerId, input.applicationId, input.signerKeyId]) {
    const result = binding(value);
    if (result !== "ok") return { ok: false, reason: result };
  }
  let admin: PublicKey;
  try {
    admin = new PublicKey(input.adminPubkey.trim());
    if (!PublicKey.isOnCurve(admin.toBytes())) return { ok: false, reason: "invalid_admin" };
  } catch {
    return { ok: false, reason: "invalid_admin" };
  }
  if (assertNoPrivateAttestationSignerMaterial(input.signerDocument).length) {
    return { ok: false, reason: "invalid_signer_document" };
  }
  const document = input.signerDocument as SignerDocument | null;
  if (!document || typeof document !== "object"
    || document.document !== CHAIN_ATTESTATION_SIGNER_DOCUMENT
    || document.algorithm !== "ed25519"
    || document.environment !== "sandbox"
    || !Array.isArray(document.keys)) {
    return { ok: false, reason: "invalid_signer_document" };
  }
  const matches = (document.keys as SignerRow[]).filter((row) =>
    row && typeof row === "object" && row.key_id === input.signerKeyId.trim());
  if (matches.length !== 1) return { ok: false, reason: "signer_unavailable" };
  const signer = matches[0];
  const now = (input.now ?? new Date()).getTime();
  const start = typeof signer.not_before === "string" ? Date.parse(signer.not_before) : NaN;
  const end = typeof signer.expires_at === "string" ? Date.parse(signer.expires_at) : NaN;
  const bytes = verifierBytes(signer.public_verifier);
  if (signer.algorithm !== "ed25519" || signer.environment !== "sandbox"
    || signer.status !== "active" || !bytes
    || !Array.isArray(signer.allowed_networks) || !signer.allowed_networks.includes("solana_devnet")
    || !Array.isArray(signer.allowed_gate_types) || !signer.allowed_gate_types.includes("solana")
    || !Array.isArray(signer.schema_versions) || !signer.schema_versions.includes("2")
    || !Number.isFinite(start) || !Number.isFinite(end) || start > now || end <= now) {
    return { ok: false, reason: "signer_ineligible" };
  }
  const gateProgramId = SOLANA_GATE_V2_RELEASE.program_id;
  const partnerProgramId = LOCALNET_SOLANA_PROGRAM_IDS.abraxas_protocol_access;
  const gateConfigPda = deriveGateConfigPda(gateProgramId, admin.toBase58());
  const hashes = hashesForApplication({
    partnerId: input.partnerId,
    policyId: SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_POLICY_ID,
    policyVersion: SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_POLICY_VERSION,
    actionType: SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_ACTION,
    actionScope: SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_SCOPE,
    environment: "sandbox",
    signerKeyId: input.signerKeyId,
  });
  return { ok: true, plan: {
    network_id: "solana_devnet",
    gate_program_id: gateProgramId,
    partner_program_id: partnerProgramId,
    admin_pubkey: admin.toBase58(),
    gate_config_pda: gateConfigPda,
    policy_id: SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_POLICY_ID,
    policy_version: SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_POLICY_VERSION,
    action_type: SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_ACTION,
    action_scope: SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_SCOPE,
    environment: "sandbox",
    network_hash: hashNetworkId("solana_devnet"),
    partner_hash: hashes.partner_hash,
    policy_hash: hashes.policy_hash,
    action_hash: hashes.action_hash,
    environment_hash: hashes.environment_hash,
    signer_key_id: input.signerKeyId.trim(),
    signer_key_hash: hashes.signer_key_hash,
    trusted_signer: `0x${Buffer.from(bytes).toString("hex")}`,
    config_digest: expectedSolanaConfigDigest({
      programId: gateProgramId,
      partnerProgramId,
      gateConfigPda,
      programDigest: SOLANA_GATE_V2_RELEASE.program_data_digest,
      partnerHash: hashes.partner_hash,
      policyHash: hashes.policy_hash,
      actionHash: hashes.action_hash,
      environment: hashes.environment_hash,
      signerKeyId: input.signerKeyId.trim(),
      subjectBindingMode: "required",
    }),
    require_subject: true,
    require_institutional: true,
    expected_organization_commitment: ZERO_BYTES32,
    expected_actor_commitment: ZERO_BYTES32,
    expected_institutional_result_category: ZERO_BYTES32,
    signer_document_active: true,
    ownership_verified: false,
    onchain_config_observed: false,
    broadcast: false,
  } };
}
