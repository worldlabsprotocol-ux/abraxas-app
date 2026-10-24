// FILE: lib/auth/nativeAccount/solanaAuth/contract.ts

export const ACCOUNT_SOL_AUTH_CONTEXT_COOKIE = "abraxas_account_sol_auth_ctx";
export const ACCOUNT_SOL_AUTH_CHALLENGE_TTL_MS = 5 * 60 * 1000;

export const ACCOUNT_SOL_AUTH_INTENT = "abraxas_account_sign_in" as const;

/** JWT / authorization envelope audience for persistent native account sign-in. */
export const NATIVE_ACCOUNT_WALLET_AUDIENCE = "abraxas_native_account" as const;

export const NATIVE_ACCOUNT_SIGN_IN_RESOURCE = "abraxas:capability:native_account_session" as const;
