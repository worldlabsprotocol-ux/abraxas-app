import { concat, keccak256, pad, stringToBytes, toHex } from "viem";
import { hashAction, hashEnvironment, hashPartnerId, hashPolicy, hashSignerKeyId } from "@/lib/partner/chainAttestation/hashes";
import type { EvmDeploymentManifest, SolanaDeploymentManifest } from "./types";

export function expectedEvmConfigDigest(input: {
  chainId: number;
  gateAddress: `0x${string}`;
  partnerHash: `0x${string}`;
  policyHash: `0x${string}`;
  actionHash: `0x${string}`;
  environment: `0x${string}`;
  signerKeyId: string;
  subjectBindingMode: string;
}): `0x${string}` {
  return keccak256(concat([
    pad(toHex(input.chainId), { size: 32 }),
    pad(input.gateAddress, { size: 32 }),
    input.partnerHash,
    input.policyHash,
    input.actionHash,
    input.environment,
    keccak256(stringToBytes(input.signerKeyId)),
    keccak256(stringToBytes(input.subjectBindingMode)),
  ]));
}

export function expectedSolanaConfigDigest(input: {
  programId: string;
  partnerProgramId: string;
  gateConfigPda: string;
  programDigest: `0x${string}`;
  partnerHash: `0x${string}`;
  policyHash: `0x${string}`;
  actionHash: `0x${string}`;
  environment: `0x${string}`;
  signerKeyId: string;
  subjectBindingMode: string;
}): `0x${string}` {
  return keccak256(concat([
    keccak256(stringToBytes(input.programId)),
    keccak256(stringToBytes(input.partnerProgramId)),
    keccak256(stringToBytes(input.gateConfigPda)),
    input.programDigest,
    input.partnerHash,
    input.policyHash,
    input.actionHash,
    input.environment,
    keccak256(stringToBytes(input.signerKeyId)),
    keccak256(stringToBytes(input.subjectBindingMode)),
  ]));
}

export function hashesForApplication(input: {
  partnerId: string;
  policyId: string;
  policyVersion: number;
  actionType: string;
  actionScope: string;
  environment: "sandbox" | "production";
  signerKeyId: string;
}) {
  return {
    partner_hash: hashPartnerId(input.partnerId),
    policy_hash: hashPolicy(input.policyId, input.policyVersion),
    action_hash: hashAction(input.actionType, input.actionScope),
    environment_hash: hashEnvironment(input.environment),
    signer_key_hash: hashSignerKeyId(input.signerKeyId),
  };
}

export function evmDigestFromManifest(manifest: EvmDeploymentManifest, environmentHash: `0x${string}`): `0x${string}` {
  return expectedEvmConfigDigest({
    chainId: manifest.chain_id,
    gateAddress: manifest.gate_address,
    partnerHash: manifest.partner_hash,
    policyHash: manifest.policy_hash,
    actionHash: manifest.action_hash,
    environment: environmentHash,
    signerKeyId: manifest.signer_key_id,
    subjectBindingMode: manifest.subject_binding_mode,
  });
}

export function solanaDigestFromManifest(manifest: SolanaDeploymentManifest, environmentHash: `0x${string}`): `0x${string}` {
  return expectedSolanaConfigDigest({
    programId: manifest.program_id,
    partnerProgramId: manifest.partner_program_id,
    gateConfigPda: manifest.gate_config_pda,
    programDigest: manifest.program_digest,
    partnerHash: manifest.partner_hash,
    policyHash: manifest.policy_hash,
    actionHash: manifest.action_hash,
    environment: environmentHash,
    signerKeyId: manifest.signer_key_id,
    subjectBindingMode: manifest.subject_binding_mode,
  });
}
