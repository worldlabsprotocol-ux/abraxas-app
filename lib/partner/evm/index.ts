// FILE: lib/partner/evm/index.ts
// Public EVM partner eligibility adapter entry.

export {
  EVM_PARTNER_ADAPTER_VERSION,
  EVM_PARTNER_ACTION_TYPES,
  EVM_PROTOCOL_SCOPE,
  EVM_MEMBER_SCOPE,
  EVM_REDEMPTION_SCOPE,
  EVM_PARTNER_ALLOWED_SCOPES,
  EVM_PARTNER_TYPE_SCOPES,
  EVM_PARTNER_CLIENT_VISIBLE_KEYS,
  EVM_PARTNER_FORBIDDEN_CLIENT_KEYS,
  EVM_CLIENT_OVERRIDE_KEYS,
  EVM_NOT_A_CHAIN_PRODUCT,
  EVM_NO_EXECUTION_BOUNDARY,
  EVM_WALLET_BINDING_OUT_OF_SCOPE,
  EVM_PRIVACY_CONTRACT,
  EVM_VERIFICATION_REUSE,
  EVM_FLOW,
  EVM_LIVE_INTEGRATION_REQUIREMENTS,
  type EvmPartnerActionType,
  type EvmPartnerActionScope,
  type EvmPartnerActionContract,
  type EvmPartnerActionBinding,
} from "@/lib/partner/evm/contract";

export {
  AbraxasEvmPartnerAdapter,
  isEvmActionType,
  isEvmActionScope,
  hasEvmExecutionOverride,
  rejectEvmClientOverride,
  type AbraxasEvmPartnerAdapterOptions,
} from "@/lib/partner/evm/adapter";

export {
  toEvmClient,
  deniedEvmResult,
  permittedEvmResult,
  assertNoSensitiveEvmClientKeys,
  type EvmPartnerClientVisibleResult,
} from "@/lib/partner/evm/clientVisible";

export {
  EVM_REF_PARTNER_ID,
  EVM_REF_POLICY_ID,
  evmFixtureReceipt,
  isEvmFixtureId,
  type EvmFixtureId,
} from "@/lib/partner/evm/fixtures";

export {
  evmPartnerServerExample,
  EVM_PARTNER_ARCHITECTURE_DIAGRAM,
} from "@/lib/partner/evm/examples";
