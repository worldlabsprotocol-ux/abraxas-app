// FILE: lib/credentials/types.ts
// Shared types for Abraxas Unified Identity — Sui-native (zkLogin holder address).

export type VerificationLevel = "basic" | "standard" | "enhanced";
export type DocumentType =
  | "passport"
  | "drivers_license"
  | "mobile_dl"
  | "national_id"
  | "real_id";

export type HolderChain = "sui";

export interface AbraxasCredentialClaims {
  "@context":          string[];
  type:                string[];
  issuer:              string;
  issuanceDate:        string;
  expirationDate:      string;
  id:                  string;

  credentialSubject: {
    id:                string;           // did:sui:0x...
    sui_address:       string;           // 0x + 64 hex
    /** @deprecated legacy Solana field — omitted on new credentials */
    wallet?:           string;
    jurisdiction:      string;
    document_type:     DocumentType;
    verification_level: VerificationLevel;
    world_id_verified: boolean;
    verified_at:       string;
    chain:             HolderChain;

    permissions: {
      fiat_offramp:    boolean;
      defi_access:     boolean;
      rwa_tokenize:    boolean;
      cross_border:    boolean;
    };
  };
}

export interface VerificationResult {
  verified:          boolean;
  credential_jti?:   string;
  holder_address?:   string;
  /** @deprecated use holder_address */
  holder_wallet?:    string;
  sui_address?:      string;
  jurisdiction?:     string;
  verification_level?: VerificationLevel;
  world_id_verified?: boolean;
  permissions?:      AbraxasCredentialClaims["credentialSubject"]["permissions"];
  expires_at?:       string;
  error?:            string;
}

export interface IssueCredentialInput {
  /** Sui address from zkLogin (preferred) */
  sui_address?:      string;
  /** @deprecated legacy — mapped to sui_address if sui_address omitted */
  wallet_address?:   string;
  world_id_nullifier?: string;
  document_type:     DocumentType;
  document_country:  string;
  document_state?:   string;
  liveness_passed:   boolean;
}

export function resolveHolderAddress(input: IssueCredentialInput): string | null {
  const addr = input.sui_address ?? input.wallet_address;
  if (!addr?.trim()) return null;
  return addr.trim();
}
