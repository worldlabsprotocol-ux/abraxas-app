// FILE: lib/partner/partnerActivitySignal/index.ts

export {
  PARTNER_ACTIVITY_SIGNAL_ADAPTER_VERSION,
  PARTNER_ACTIVITY_SIGNAL_TYPES,
  PARTNER_ACTIVITY_RECEIPT_REQUIREMENT,
  PARTNER_ACTIVITY_NOT_ELIGIBILITY,
  PARTNER_ACTIVITY_NO_RAW_DATA,
  PARTNER_ACTIVITY_CLIENT_VISIBLE_KEYS,
  PARTNER_ACTIVITY_FORBIDDEN_CLIENT_KEYS,
  PARTNER_ACTIVITY_SAFE_REASON_CODES,
  PARTNER_ACTIVITY_CLIENT_OVERRIDE_KEYS,
  validatePartnerActivitySignal,
  rejectPartnerActivityClientOverride,
  isPartnerActivitySignalType,
  type PartnerActivitySignal,
  type PartnerActivitySignalType,
  type PartnerActivitySafeReasonCode,
} from "./contract";

export {
  issuePartnerActivitySignalBinding,
  normalizePartnerActivitySignalBinding,
  hashActivitySignalBinding,
  type PartnerActivitySignalBinding,
} from "./bind";

export {
  preflightPartnerActivitySignal,
} from "./preflight";

export {
  deniedActivityResult,
  permittedActivityResult,
  assertNoSensitiveActivityClientKeys,
  type PartnerActivityClientVisibleResult,
  type PartnerActivityBindingState,
} from "./clientVisible";

export {
  AbraxasPartnerActivitySignalAdapter,
  type AbraxasPartnerActivitySignalAdapterOptions,
} from "./adapter";

export {
  ACTIVITY_REF_PARTNER_ID,
  ACTIVITY_REF_POLICY_ID,
  ACTIVITY_FIXTURE_PAYLOAD_HASH,
  activityFixtureReceipt,
  isActivityFixtureId,
  type ActivityFixtureId,
} from "./fixtures";
