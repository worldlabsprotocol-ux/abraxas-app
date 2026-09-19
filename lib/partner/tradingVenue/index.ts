// FILE: lib/partner/tradingVenue/index.ts
// Public Trading Venue Adapter entry.

export {
  TRADING_VENUE_ADAPTER_VERSION,
  TRADING_VENUE_ACTION_TYPES,
  TRADING_VENUE_SANDBOX_SCOPE,
  TRADING_VENUE_ALLOWED_SCOPES,
  TRADING_VENUE_SAFE_REASON_CODES,
  TRADING_VENUE_CLIENT_VISIBLE_KEYS,
  TRADING_VENUE_FORBIDDEN_CLIENT_KEYS,
  TRADING_VENUE_NOT_A_MARKET,
  TRADING_VENUE_NO_FUNDS_BOUNDARY,
  TRADING_VENUE_NO_VENUE_PARTNERSHIP,
  TRADING_VENUE_WALLET_BINDING_FUTURE,
  TRADING_VENUE_PRIVACY_CONTRACT,
  TRADING_VENUE_VERIFICATION_REUSE,
  TRADING_VENUE_FLOW,
  TRADING_VENUE_LIVE_INTEGRATION_REQUIREMENTS,
  type TradingVenueActionType,
  type TradingVenueActionScope,
  type TradingVenueSafeReasonCode,
  type TradingVenueActionContract,
  type TradingVenueActionBinding,
} from "@/lib/partner/tradingVenue/contract";

export {
  AbraxasTradingVenueAdapter,
  isVenueActionType,
  isVenueActionScope,
  type AbraxasTradingVenueAdapterOptions,
} from "@/lib/partner/tradingVenue/adapter";

export {
  toClientVisibleResult,
  reasonFromOutcome,
  assertNoSensitiveVenueClientKeys,
  type TradingVenueClientVisibleResult,
} from "@/lib/partner/tradingVenue/clientVisible";

export {
  VENUE_REF_PARTNER_ID,
  VENUE_REF_POLICY_ID,
  venueFixtureReceipt,
  isVenueFixtureId,
  type VenueFixtureId,
} from "@/lib/partner/tradingVenue/fixtures";

export {
  tradingVenueServerPreflightExample,
  TRADING_VENUE_ARCHITECTURE_DIAGRAM,
} from "@/lib/partner/tradingVenue/examples";

export { resetTradingVenueNonceStoreForTests } from "@/lib/partner/tradingVenue/nonceStore";
