// FILE: lib/partner/chainAttestation/signer.ts
// Dedicated secp256k1 EVM attestation signer. Never reuses receipt Ed25519 keys.

import { privateKeyToAccount } from "viem/accounts";
import { isHex } from "viem";
import { eip712TypedData } from "./eip712";
import type { ChainEligibilityAttestationFields, Eip712Domain } from "./contract";

export const EVM_ATTESTATION_KEY_ENV = "ABRAXAS_EVM_ATTESTATION_PRIVATE_KEY" as const;
export const EVM_ATTESTATION_KEY_ID_ENV = "ABRAXAS_EVM_ATTESTATION_SIGNER_KEY_ID" as const;
export const RECEIPT_SIGNING_KEY_ENVS = [
  "ABRAXAS_RECEIPT_SIGNING_PRIVATE_KEY",
  "RECEIPT_SIGNING_PRIVATE_KEY",
  "ABRAXAS_ED25519_PRIVATE_KEY",
] as const;

export interface EvmAttestationSigner {
  keyId: string;
  address: `0x${string}`;
  sign(domain: Eip712Domain, message: ChainEligibilityAttestationFields): Promise<`0x${string}`>;
}

export function loadEvmAttestationSigner():
  | { ok: true; signer: EvmAttestationSigner }
  | { ok: false; reason: "attestation_unavailable" } {
  const raw = process.env[EVM_ATTESTATION_KEY_ENV]?.trim() ?? "";
  const keyId = process.env[EVM_ATTESTATION_KEY_ID_ENV]?.trim() ?? "";
  if (!raw || !keyId) return { ok: false, reason: "attestation_unavailable" };
  if (RECEIPT_SIGNING_KEY_ENVS.some((name) => process.env[name]?.trim() && process.env[name]?.trim() === raw)) {
    return { ok: false, reason: "attestation_unavailable" };
  }
  const hex = raw.startsWith("0x") ? raw : `0x${raw}`;
  if (!isHex(hex) || hex.length !== 66) return { ok: false, reason: "attestation_unavailable" };
  try {
    const account = privateKeyToAccount(hex as `0x${string}`);
    return {
      ok: true,
      signer: {
        keyId,
        address: account.address,
        async sign(domain, message) {
          const typed = eip712TypedData(domain, message);
          return account.signTypedData({
            domain: typed.domain,
            types: typed.types,
            primaryType: typed.primaryType,
            message: typed.message,
          } as never);
        },
      },
    };
  } catch {
    return { ok: false, reason: "attestation_unavailable" };
  }
}
