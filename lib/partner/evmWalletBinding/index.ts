// FILE: lib/partner/evmWalletBinding/index.ts

export {
  EVM_WALLET_BINDING_VERSION,
  EVM_WALLET_BINDING_PURPOSE,
  EVM_WALLET_SIGNING_STANDARD,
  EVM_WALLET_SIGNING_LIBRARY,
  EVM_WALLET_BINDING_MODES,
  EVM_WALLET_SAFE_REASONS,
  EVM_WALLET_CLIENT_VISIBLE_KEYS,
  EVM_WALLET_CHALLENGE_CLIENT_KEYS,
  EVM_WALLET_REJECTED_CLIENT_KEYS,
  EVM_WALLET_NOT_IDENTITY,
  EVM_WALLET_NO_TRANSACTION,
  EVM_WALLET_MESSAGE_PROOF_ONLY,
  type EvmWalletBindingMode,
  type EvmWalletSafeReason,
  type EvmWalletChallengeView,
  type EvmWalletBindView,
} from "./contract";
export { issueEvmWalletChallenge, buildEvmWalletChallengeMessage } from "./challenge";
export { bindEvmWalletControl } from "./bind";
export { resolveEvmWalletBindingForAction, revokeEvmWalletControlBinding } from "./resolve";
export { assertNoSensitiveEvmWalletClientKeys, rejectEvmWalletClientOverride } from "./safety";
export { evmWalletBindingExample, EVM_WALLET_BINDING_ARCHITECTURE } from "./examples";
export { EVM_WALLET_MIGRATION_PLAN } from "./migrationPlan";
export { EvmWalletStoreUnavailableError } from "./errors";
