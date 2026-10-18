// FILE: lib/infrastructure/persistencePorts.ts
// Narrow storage port documentation — business logic uses these facades, not vendor SDKs directly.

/**
 * NativeAccountStore — implemented by lib/auth/nativeAccount/store.ts
 * (Postgres via requirePersistenceAdmin or test memory backend).
 */
export type NativeAccountStorePort = {
  insertNativeAccount: (accountId: string) => Promise<void>;
  findPasskeyByCredentialId: (credentialId: string) => Promise<unknown>;
  insertWebAuthnChallenge: (input: unknown) => Promise<string>;
  consumeWebAuthnChallengeAtomic: (challengeId: string) => Promise<unknown>;
  assertPartnerMembership: (accountId: string, partnerId: string) => Promise<unknown>;
  recordSandboxEnrollment: (input: unknown) => Promise<void>;
};

/**
 * WebAuthnChallengeStore — atomic consume via migration 145 RPC
 * abraxas_consume_webauthn_challenge_atomic.
 */
export type WebAuthnChallengeStorePort = Pick<
  NativeAccountStorePort,
  "insertWebAuthnChallenge" | "consumeWebAuthnChallengeAtomic"
>;

/** OrganizationMembershipStore — abraxas_account_partner_memberships + grants. */
export type OrganizationMembershipStorePort = Pick<
  NativeAccountStorePort,
  "assertPartnerMembership" | "recordSandboxEnrollment"
>;

/** ReceiptRegistryStore — decision receipt rows; signature verify is crypto-only. */
export type ReceiptRegistryStorePort = {
  loadReceiptRecord: (receiptId: string) => Promise<unknown>;
};

/** CredentialStatusStore — hybrid pg for passport reusable credentials when enabled. */
export type CredentialStatusStorePort = {
  resolveClaimStatus: (claimId: string) => Promise<unknown>;
};
