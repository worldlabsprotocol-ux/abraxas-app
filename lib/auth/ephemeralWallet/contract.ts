// FILE: lib/auth/ephemeralWallet/contract.ts

import { EPHEMERAL_TTL } from "./retention";

export const WALLET_SOL_AUTH_CONTEXT_COOKIE = "abraxas_wallet_sol_auth_ctx";
export const WALLET_SOL_AUTH_CHALLENGE_TTL_MS = EPHEMERAL_TTL.authChallengeSec * 1000;

export const EPHEMERAL_WALLET_JWT_ISSUER = "https://abraxas.app/ephemeral-wallet";
export const EPHEMERAL_WALLET_JWT_AUDIENCE = "abraxas_ephemeral_wallet";
