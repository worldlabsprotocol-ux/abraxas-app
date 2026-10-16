/**
 * SYNTHETIC TEST FIXTURES ONLY — not production issuer material.
 * Used by external integration examples and smoke tests.
 */
declare const SYNTHETIC_FIXTURE_NOTICE = "Synthetic Ed25519 keys and receipts for local SDK smoke tests only. Never use in production.";
declare const SYNTHETIC_PARTNER_ID = "institutional-rp-example";
declare const SYNTHETIC_POLICY_ID = "institutional-age-21-v1";
declare const SYNTHETIC_FIXTURE_NOW_ISO = "2026-06-15T12:00:00.000Z";
declare function loadSyntheticTrustRegistryJson(): string;
declare function loadSyntheticSignedReceipt(): unknown;
declare function loadSyntheticDigestPin(): string;

export { SYNTHETIC_FIXTURE_NOTICE, SYNTHETIC_FIXTURE_NOW_ISO, SYNTHETIC_PARTNER_ID, SYNTHETIC_POLICY_ID, loadSyntheticDigestPin, loadSyntheticSignedReceipt, loadSyntheticTrustRegistryJson };
