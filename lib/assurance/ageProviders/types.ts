// FILE: lib/assurance/ageProviders/types.ts
// Provider-neutral age-assurance adapter contract.

export type AgeThreshold = 18 | 21;

export type AgeBand = "under_18" | "over_18" | "over_21" | "unknown";

export type AgeAssuranceSessionStatus =
  | "pending"
  | "redirected"
  | "completed"
  | "failed"
  | "expired"
  | "cancelled";

export interface AgeAssuranceProviderCapabilities {
  over18: boolean;
  over21: boolean;
  exactDobReturned: boolean;
  documentUploadRequired: boolean;
  biometricRequired: boolean;
}

/** Safe metadata exposed to the frontend — never secrets. */
export interface AgeAssuranceProviderPublicMeta {
  id: string;
  displayName: string;
  assuranceLevel: string;
  capabilities: AgeAssuranceProviderCapabilities;
  configured: boolean;
  unavailableReason?: string;
}

export interface AgeAssuranceProvider {
  id: string;
  displayName: string;
  assuranceLevel: string;
  capabilities: AgeAssuranceProviderCapabilities;

  isConfigured(): boolean;

  createSession(input: {
    subjectRef: string;
    requestedThreshold: AgeThreshold;
    partnerId: string;
    policyId: string;
    returnUrl: string;
    sessionNonce: string;
  }): Promise<{
    providerSessionId: string;
    redirectUrl: string;
    expiresAt: string;
  }>;

  verifyCallback(input: {
    providerSessionId: string;
    callbackPayload: unknown;
    expectedNonce?: string;
  }): Promise<{
    verified: boolean;
    ageBand: AgeBand;
    assuranceLevel: string;
    evidenceRefHash: string;
    expiresAt?: string;
    reasonCode?: string;
  }>;
}

export interface AgeAssuranceSessionRecord {
  id: string;
  session_nonce: string;
  provider_id: string;
  provider_session_id: string | null;
  subject_sui_address: string;
  partner_id: string;
  policy_id: string;
  return_url: string;
  requested_threshold: AgeThreshold;
  status: AgeAssuranceSessionStatus;
  age_band_result: AgeBand | null;
  assurance_level: string | null;
  evidence_ref_hash: string | null;
  callback_consumed_at: string | null;
  expires_at: string;
  completed_at: string | null;
  reason_code: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuthoritativeAgeAssuranceResult {
  verified: boolean;
  ageBand: AgeBand;
  assuranceLevel: string;
  evidenceRefHash: string;
  providerId: string;
  expiresAt?: string;
  reasonCode?: string;
}
