// FILE: lib/privacy/selectiveDisclosure/index.ts

export {
  SELECTIVE_DISCLOSURE_VERSION,
  SELECTIVE_DISCLOSURE_NOTICE,
  SELECTIVE_DISCLOSURE_CRYPTOGRAPHY_NOTICE,
  SELECTIVE_DISCLOSURE_FORBIDDEN_CLASSES,
  SELECTIVE_DISCLOSURE_CLIENT_OVERRIDE_KEYS,
  SHARED_SURFACE_FIELDS,
  type SelectiveDisclosureProfile,
} from "./contract";
export { SELECTIVE_DISCLOSURE_PROFILES, GENERIC_MINIMAL_PROFILE, profileFromPack, resolveDisclosureProfile, allowedFieldsForSurface } from "./profiles";
export { applyDisclosureProfile, pickAllowedKeys, failClosedDisclosureError } from "./enforce";
export { detectDisclosureLeaks } from "./leakDetector";
export { rejectClientDisclosureConfig } from "./clientOverride";
