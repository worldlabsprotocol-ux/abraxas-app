import { describe, expect, it } from "vitest";
import {
  classifyGoogleAudience,
  getTrustedGoogleAudiences,
  isBrowserLegacyRecoveryAvailable,
  isTrustedGoogleAudience,
  parseServerLegacyGoogleClientIds,
  resolveOAuthClientIdForMode,
  ZKLOGIN_ENV_KEYS,
} from "./audienceCohorts";

const CANONICAL = "540000000000-newclient.apps.googleusercontent.com";
const LEGACY = "187000000000-legacyclient.apps.googleusercontent.com";
const OTHER_LEGACY = "legacy-two.apps.googleusercontent.com";

const alignedEnv = {
  [ZKLOGIN_ENV_KEYS.canonicalClientIdPublic]: CANONICAL,
  [ZKLOGIN_ENV_KEYS.legacyClientIdPublic]: LEGACY,
  [ZKLOGIN_ENV_KEYS.legacyClientIds]: LEGACY,
};

describe("audienceCohorts", () => {
  it("includes canonical and server-allowlisted legacy audiences in trusted set", () => {
    const trusted = getTrustedGoogleAudiences(alignedEnv);
    expect(trusted).toContain(CANONICAL);
    expect(trusted).toContain(LEGACY);
    expect(trusted).toHaveLength(2);
  });

  it("classifies canonical vs legacy cohorts from server allowlist", () => {
    expect(classifyGoogleAudience(CANONICAL, alignedEnv)).toBe("canonical");
    expect(classifyGoogleAudience(LEGACY, alignedEnv)).toBe("legacy");
    expect(classifyGoogleAudience("evil-client.apps.googleusercontent.com", alignedEnv)).toBe("untrusted");
  });

  it("rejects untrusted audience", () => {
    expect(isTrustedGoogleAudience("evil-client.apps.googleusercontent.com", alignedEnv)).toBe(false);
  });

  it("enables browser recovery only when public legacy client is server-allowlisted", () => {
    expect(isBrowserLegacyRecoveryAvailable(alignedEnv)).toBe(true);
    expect(resolveOAuthClientIdForMode("legacy_recovery", alignedEnv)).toBe(LEGACY);
  });

  it("disables recovery when only server allowlist is configured", () => {
    const serverOnly = {
      [ZKLOGIN_ENV_KEYS.canonicalClientIdPublic]: CANONICAL,
      [ZKLOGIN_ENV_KEYS.legacyClientIds]: LEGACY,
      [ZKLOGIN_ENV_KEYS.legacyClientIdPublic]: "",
    };
    expect(isBrowserLegacyRecoveryAvailable(serverOnly)).toBe(false);
    expect(resolveOAuthClientIdForMode("legacy_recovery", serverOnly)).toBeNull();
    expect(getTrustedGoogleAudiences(serverOnly)).toContain(LEGACY);
  });

  it("disables recovery when public legacy client is not server-allowlisted", () => {
    const publicOnly = {
      [ZKLOGIN_ENV_KEYS.canonicalClientIdPublic]: CANONICAL,
      [ZKLOGIN_ENV_KEYS.legacyClientIdPublic]: LEGACY,
      [ZKLOGIN_ENV_KEYS.legacyClientIds]: "",
    };
    expect(isBrowserLegacyRecoveryAvailable(publicOnly)).toBe(false);
    expect(resolveOAuthClientIdForMode("legacy_recovery", publicOnly)).toBeNull();
    expect(isTrustedGoogleAudience(LEGACY, publicOnly)).toBe(false);
  });

  it("disables recovery when public and server legacy client ids disagree", () => {
    const mismatched = {
      [ZKLOGIN_ENV_KEYS.canonicalClientIdPublic]: CANONICAL,
      [ZKLOGIN_ENV_KEYS.legacyClientIdPublic]: LEGACY,
      [ZKLOGIN_ENV_KEYS.legacyClientIds]: OTHER_LEGACY,
    };
    expect(isBrowserLegacyRecoveryAvailable(mismatched)).toBe(false);
    expect(resolveOAuthClientIdForMode("legacy_recovery", mismatched)).toBeNull();
    expect(isTrustedGoogleAudience(LEGACY, mismatched)).toBe(false);
    expect(isTrustedGoogleAudience(OTHER_LEGACY, mismatched)).toBe(true);
  });

  it("parses comma-separated legacy client ids from server env", () => {
    const ids = parseServerLegacyGoogleClientIds({
      [ZKLOGIN_ENV_KEYS.legacyClientIds]: `${LEGACY},${OTHER_LEGACY}`,
    });
    expect(ids).toEqual([LEGACY, OTHER_LEGACY]);
  });
});
