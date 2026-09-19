// FILE: lib/partner/solana/index.ts
// Public Solana Partner Adapter entry.

export {
  SOLANA_PARTNER_ADAPTER_VERSION,
  SOLANA_PARTNER_ACTIONS,
  SOLANA_SAFE_REASON_CODES,
  SOLANA_CLIENT_VISIBLE_KEYS,
  SOLANA_FORBIDDEN_CLIENT_KEYS,
  SOLANA_NO_FUNDS_BOUNDARY,
  SOLANA_PRIVACY_CONTRACT,
  SOLANA_VERIFICATION_REUSE,
  type SolanaPartnerAction,
  type SolanaSafeReasonCode,
} from "@/lib/partner/solana/contract";

export {
  AbraxasSolanaPartnerAdapter,
  parseSolanaPartnerProgramId,
  type AbraxasSolanaPartnerAdapterOptions,
} from "@/lib/partner/solana/adapter";

export {
  toClientVisibleResult,
  reasonFromOutcome,
  assertNoSensitiveClientKeys,
  type SolanaClientVisibleResult,
} from "@/lib/partner/solana/clientVisible";

export {
  SOLANA_REF_PARTNER_ID,
  SOLANA_REF_POLICY_ID,
  solanaFixtureReceipt,
  isSolanaFixtureId,
  type SolanaFixtureId,
} from "@/lib/partner/solana/fixtures";

export { solanaServerVerifyExample, SOLANA_ARCHITECTURE_DIAGRAM } from "@/lib/partner/solana/examples";
