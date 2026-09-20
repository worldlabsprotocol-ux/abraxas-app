// FILE: lib/partner/tradingVenue/profiles/index.ts

export {
  VENUE_PROFILE_REGISTRY_VERSION,
  VENUE_PROFILE_IDS,
  VENUE_PROFILE_POSTURES,
  VENUE_PROFILE_SAFE_REASONS,
  VENUE_PROFILE_CLIENT_OVERRIDE_KEYS,
  VENUE_PROFILE_NEXT_STEPS,
  VENUE_PROFILE_NO_PARTNERSHIP,
  VENUE_PROFILE_PREFLIGHT_ONLY,
  VENUE_MAINNET_EXTERNAL_REQUIREMENTS,
} from "./contract";
export type {
  VenueProfileId,
  VenueProfilePosture,
  VenueProfileSafeReason,
  VenueIntegrationProfile,
} from "./contract";
export {
  VENUE_PROFILE_REGISTRY,
  getVenueProfile,
  isVenueProfileId,
  selectableSandboxVenueProfiles,
  publicVenueProfileMatrix,
} from "./registry";
export { resolveVenueProfile, rejectVenueProfileClientOverride } from "./resolve";
export { tradingVenueProfileExample, VENUE_PROFILE_ARCHITECTURE } from "./examples";
