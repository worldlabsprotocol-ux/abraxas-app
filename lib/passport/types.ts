// FILE: lib/passport/types.ts
// Chain-agnostic Abraxas Passport root types.

export const PROOF_TYPE_ED25519 = 0;
export const PROOF_TYPE_ZK_LOGIN = 1;

export interface PassportRoot {
  version: number;
  stamps: number;
  /** 32-byte issuance authority (Ed25519 pubkey or chain address bytes) */
  authority: Uint8Array;
  /** Unix seconds; 0 = no expiration */
  expiresAt: number;
  revoked: boolean;
  nonce: number;
}

export interface Ed25519VerificationProof {
  proofType: typeof PROOF_TYPE_ED25519;
  signature: Uint8Array;
  signer: Uint8Array;
}

/** Type 1 — ZK presentation linking Sui zkLogin to passport root (roadmap) */
export interface ZkLoginVerificationProof {
  proofType: typeof PROOF_TYPE_ZK_LOGIN;
  /** Serialized ZK proof bytes from proving service */
  zkProof: Uint8Array;
  /** Sui address derived from zkLogin (32 bytes) */
  suiAddress: Uint8Array;
  /** Ephemeral key commitment used in OAuth nonce */
  ephemeralKeyHash: Uint8Array;
}

export type VerificationProof = Ed25519VerificationProof | ZkLoginVerificationProof;

export interface VerifyPassportParams {
  passport: PassportRoot;
  requiredStamps: number;
  currentTimestamp: number;
  proof: VerificationProof;
}

export interface VerifyPassportResult {
  valid: boolean;
  reason?: string;
}
