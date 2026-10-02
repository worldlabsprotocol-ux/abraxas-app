// FILE: lib/custody/chainCommitmentAdapter.ts
// Optional chain commitment adapter — hashes only, never raw evidence.

import { assertCustodySafePayload, throwIfCustodyViolation } from "./guardrails";
import type { StorageClass } from "./types";

export const CHAIN_COMMITMENT_ADAPTER_VERSION = "1.0.0" as const;

export interface ChainCommitmentInput {
  subjectBindingHash: string;
  policyHash: string;
  partnerHash: string;
  resultCategoryHash: string;
  expiresAtUnix?: number;
  receiptPayloadHash?: string;
  artifactContentHash?: string;
}

export interface ChainCommitmentRecord {
  adapterVersion: typeof CHAIN_COMMITMENT_ADAPTER_VERSION;
  networkId: string;
  commitments: ChainCommitmentInput;
  anchorReference: string | null;
  optional: true;
}

export interface ChainCommitmentAdapter {
  readonly adapterId: string;
  readonly optional: true;
  readonly supportedNetworks: readonly string[];
  buildCommitment(input: ChainCommitmentInput): ChainCommitmentRecord;
  validateCommitment(record: ChainCommitmentRecord): { ok: true } | { ok: false; reason: string };
}

const HEX_HASH = /^[a-f0-9]{64}$/i;
const BYTES32 = /^0x[a-f0-9]{64}$/i;

function isSafeHash(value: string | undefined): boolean {
  if (!value) return false;
  return HEX_HASH.test(value) || BYTES32.test(value);
}

export function validateChainCommitmentInput(input: ChainCommitmentInput): { ok: true } | { ok: false; reason: string } {
  const custody = assertCustodySafePayload(input, "chain_commitment");
  if (!custody.ok) return { ok: false, reason: "custody_violation" };

  const required = [
    "subjectBindingHash",
    "policyHash",
    "partnerHash",
    "resultCategoryHash",
  ] as const;
  for (const key of required) {
    if (!isSafeHash(input[key])) return { ok: false, reason: `invalid_hash:${key}` };
  }
  if (input.receiptPayloadHash && !isSafeHash(input.receiptPayloadHash)) {
    return { ok: false, reason: "invalid_hash:receiptPayloadHash" };
  }
  if (input.artifactContentHash && !isSafeHash(input.artifactContentHash)) {
    return { ok: false, reason: "invalid_hash:artifactContentHash" };
  }
  return { ok: true };
}

export const noopChainCommitmentAdapter: ChainCommitmentAdapter = {
  adapterId: "noop",
  optional: true,
  supportedNetworks: [],
  buildCommitment(input) {
    const validated = validateChainCommitmentInput(input);
    if (!validated.ok) throw new Error(`invalid_chain_commitment:${validated.reason}`);
    throwIfCustodyViolation(assertCustodySafePayload(input, "chain_commitment"), "noop_adapter_build");
    return {
      adapterVersion: CHAIN_COMMITMENT_ADAPTER_VERSION,
      networkId: "none",
      commitments: input,
      anchorReference: null,
      optional: true,
    };
  },
  validateCommitment(record) {
    if (record.adapterVersion !== CHAIN_COMMITMENT_ADAPTER_VERSION) {
      return { ok: false, reason: "unsupported_version" };
    }
    return validateChainCommitmentInput(record.commitments);
  },
};

export function storageClassesEligibleForChain(): StorageClass[] {
  return ["commitment"];
}
