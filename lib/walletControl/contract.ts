// FILE: lib/walletControl/contract.ts
// Canonical wallet-control evidence primitive — control proof, not ownership.

export const WALLET_CONTROL_EVIDENCE_CLASS = "wallet_control" as const;

export const WALLET_CONTROL_CLAIM_TYPE = "wallet_binding_confirmed" as const;

export const WALLET_CONTROL_RESULT_FAMILY = "wallet_control_confirmed" as const;

/** Session-bound reuse window aligned with wallet_control policy pack. */
export const WALLET_CONTROL_FRESHNESS_HOURS = 12;

export const WALLET_CONTROL_NOT_OWNERSHIP =
  "Wallet control evidence proves the holder demonstrated control of a wallet address at verification time. It does not prove legal ownership, beneficial ownership, identity, source of funds, AML clearance, sanctions clearance, custody status, or portfolio value.";

export const WALLET_CONTROL_NOT_CUSTODY =
  "Abraxas verifies a cryptographic control proof or scoped provider assertion. Abraxas does not custody keys, read balances, or infer every wallet the holder owns.";

export const WALLET_CONTROL_PARTNER_BOOLEAN =
  "Partners receive wallet_control_confirmed only. Wallet addresses, other wallets, balances, and transaction history are withheld unless a future explicit address-disclosure policy authorizes more.";

export const WALLET_CONTROL_EVIDENCE_REF_PREFIX = "wb:" as const;

export function walletControlEvidenceRef(bindingId: string): string {
  return `${WALLET_CONTROL_EVIDENCE_REF_PREFIX}${bindingId}`;
}

export function parseWalletControlEvidenceRef(ref: string | null | undefined): string | null {
  if (!ref?.startsWith(WALLET_CONTROL_EVIDENCE_REF_PREFIX)) return null;
  const id = ref.slice(WALLET_CONTROL_EVIDENCE_REF_PREFIX.length);
  return id.length > 0 ? id : null;
}
