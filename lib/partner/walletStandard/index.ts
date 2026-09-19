// FILE: lib/partner/walletStandard/index.ts
// Public Wallet Standard binding entry. Server modules only from API routes.

export {
  WALLET_STANDARD_BINDING_VERSION,
  WALLET_STANDARD_PURPOSE,
  WALLET_STANDARD_BINDING_MODES,
  WALLET_STANDARD_SAFE_REASONS,
  WALLET_STANDARD_CLIENT_VISIBLE_KEYS,
  WALLET_STANDARD_NOT_IDENTITY,
  WALLET_STANDARD_NO_WALLET_PRODUCT,
  WALLET_STANDARD_CONNECTOR_NOTICE,
  type WalletStandardBindingMode,
  type WalletStandardSafeReason,
  type WalletStandardChallengeView,
  type WalletStandardBindView,
} from "@/lib/partner/walletStandard/contract";

export { issueWalletStandardChallenge, isAllowedWalletStandardOrigin } from "@/lib/partner/walletStandard/challenge";
export { bindWalletStandard } from "@/lib/partner/walletStandard/bind";
export { resolveWalletBindingForAction, revokeWalletStandardBinding } from "@/lib/partner/walletStandard/resolve";
export { WALLET_STANDARD_MIGRATION_PLAN } from "@/lib/partner/walletStandard/migrationPlan";
export { resetWalletStandardStoreForTests } from "@/lib/partner/walletStandard/store";
export { walletStandardBindingExample } from "@/lib/partner/walletStandard/examples";
export { assertNoSensitiveWalletClientKeys } from "@/lib/partner/walletStandard/safety";
