// FILE: lib/partner/trustExecution/constants.ts

export const PARTNER_TRUST_EXECUTION_ACTION = "partner_flow:evaluate" as const;

export const PARTNER_TRUST_EXECUTION_AUDIENCE = "abraxas_wallet_trust_execution" as const;

export const PARTNER_TRUST_EXECUTION_CHALLENGE_TTL_MS = 5 * 60 * 1000;

export const PARTNER_TRUST_EXECUTION_RESOURCE_PREFIX = "abraxas:partner-flow:trust-execution" as const;
