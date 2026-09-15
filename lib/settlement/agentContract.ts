// FILE: lib/settlement/agentContract.ts
// Agentic settlement API contract. Agent private keys remain outside Abraxas.

export interface AgentSettlementAuthorizationRequest {
  partner_id: string;
  application_id: string;
  receipt_id: string;
  eligible_wallet: string;
  amount_micro_usdc: string;
  settlement_reference?: string;
}

export interface AgentSettlementAuthorizationResponse {
  authorization_id: string;
  chain_id: number;
  contract_address: string;
  token_address: string;
  recipient: string;
  amount_micro_usdc: string;
  amount_kind: "exact" | "max";
  expires_at: string;
  settlement_reference: string;
  typed_data: Record<string, unknown>;
  signature: string;
  fee_quote: {
    base_amount_micro_usdc: string;
    fee_micro_usdc: string;
    total_amount_micro_usdc: string;
    fee_active: boolean;
  };
}

/**
 * Agent execution contract:
 * 1. Agent holds its own EVM wallet and private key outside Abraxas.
 * 2. Controlling user must hold a valid Abraxas eligibility receipt.
 * 3. Partner policy must permit the requested action and amount.
 * 4. Authorization binds destination recipient, token, and wallet.
 * 5. Contract enforces nonce uniqueness and expiration.
 * 6. Abraxas authorizes the action; it does not custody agent funds.
 */
export const AGENT_SETTLEMENT_RULES = [
  "The controlling user must complete or reuse a valid Abraxas proof before authorization.",
  "The partner policy must permit the action type and amount range.",
  "The authorization binds one eligible wallet, one recipient, and one token.",
  "The agent wallet must match the eligible wallet in the authorization.",
  "The nonce must be unused and the authorization must be unexpired.",
  "Abraxas never stores or signs with the agent private key.",
] as const;
