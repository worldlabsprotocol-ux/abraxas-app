// FILE: lib/credentials/types.ts
// Shared types for Abraxas Unified Identity system.

export type VerificationLevel = "basic" | "standard" | "enhanced";
export type DocumentType =
  | "passport"
  | "drivers_license"
  | "mobile_dl"       // Apple/Google Wallet mobile driver's license (ISO 18013-5)
  | "national_id"
  | "real_id";        // US Real ID compliant license

// What gets signed into the JWT credential
export interface AbraxasCredentialClaims {
  // Standard W3C VC fields
  "@context":          string[];
  type:                string[];
  issuer:              string;
  issuanceDate:        string;
  expirationDate:      string;
  id:                  string;           // urn:uuid:<jti>

  credentialSubject: {
    id:                string;           // "did:sol:<wallet_address>"
    wallet:            string;           // Solana pubkey
    jurisdiction:      string;           // "US-CA"
    document_type:     DocumentType;
    verification_level: VerificationLevel;
    world_id_verified: boolean;
    verified_at:       string;           // ISO timestamp

    // What this credential allows — other protocols check this
    permissions: {
      fiat_offramp:    boolean;          // USD → CAD, AUD, etc.
      defi_access:     boolean;          // KYC-gated DeFi
      rwa_tokenize:    boolean;          // Submit RWA on Abraxas
      cross_border:    boolean;          // International transfers
    };
  };
}

// What the /verify endpoint returns to a requesting protocol
export interface VerificationResult {
  verified:          boolean;
  credential_jti?:   string;
  holder_wallet?:    string;
  jurisdiction?:     string;
  verification_level?: VerificationLevel;
  world_id_verified?: boolean;
  permissions?:      AbraxasCredentialClaims["credentialSubject"]["permissions"];
  expires_at?:       string;
  error?:            string;
}

// Input to the /issue endpoint
export interface IssueCredentialInput {
  wallet_address:    string;
  world_id_nullifier?: string;
  document_type:     DocumentType;
  document_country:  string;
  document_state?:   string;
  liveness_passed:   boolean;
}
