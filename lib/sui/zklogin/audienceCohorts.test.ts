import { describe, expect, it } from "vitest";
import {
  classifyGoogleAudience,
  getServerCanonicalGoogleClientId,
  getTrustedGoogleAudiences,
  isBrowserLegacyRecoveryAvailable,
  isTrustedGoogleAudience,
  parseServerLegacyGoogleClientIds,
  ZKLOGIN_ENV_KEYS,
} from "./audienceCohorts";

const CANONICAL = "540000000000-newclient.apps.googleusercontent.com";
const LEGACY = "187000000000-legacyclient.apps.googleusercontent.com";
const OTHER_LEGACY = "legacy-two.apps.googleusercontent.com";

const alignedEnv = {
  [ZKLOGIN_ENV_KEYS.canonicalClientId]: CANONICAL,
  [ZKLOGIN_ENV_KEYS.legacyClientIdPublic]: LEGACY,
  [ZKLOGIN_ENV_KEYS.legacyClientIds]: LEGACY,
};

describe("audienceCohorts — server verification", () => {
  it("includes canonical and server-allowlisted legacy audiences in trusted set", () => {
    const trusted = getTrustedGoogleAudiences(alignedEnv);
    expect(trusted).toContain(CANONICAL);
    expect(trusted).toContain(LEGACY);
    expect(trusted).toHaveLength(2);
  });

  it("prefers server canonical client id over public when both are set", () => {
    expect(
      getServerCanonicalGoogleClientId({
        [ZKLOGIN_ENV_KEYS.canonicalClientId]: CANONICAL,
        [ZKLOGIN_ENV_KEYS.canonicalClientIdPublic]: "public-only.apps.googleusercontent.com",
      }),
    ).toBe(CANONICAL);
  });

  it("falls back to public canonical client id when server canonical is unset", () => {
    expect(
      getServerCanonicalGoogleClientId({
        [ZKLOGIN_ENV_KEYS.canonicalClientId]: "",
        [ZKLOGIN_ENV_KEYS.canonicalClientIdPublic]: "public-only.apps.googleusercontent.com",
      }),
    ).toBe("public-only.apps.googleusercontent.com");
  });

  it("classifies canonical vs legacy cohorts from server allowlist", () => {
    expect(classifyGoogleAudience(CANONICAL, alignedEnv)).toBe("canonical");
    expect(classifyGoogleAudience(LEGACY, alignedEnv)).toBe("legacy");
    expect(classifyGoogleAudience("evil-client.apps.googleusercontent.com", alignedEnv)).toBe("untrusted");
  });

  it("rejects untrusted audience", () => {
    expect(isTrustedGoogleAudience("evil-client.apps.googleusercontent.com", alignedEnv)).toBe(false);
  });

  it("enables server recovery hint only when public legacy client is server-allowlisted", () => {
    expect(isBrowserLegacyRecoveryAvailable(alignedEnv)).toBe(true);
  });

  it("disables server recovery hint when only server allowlist is configured", () => {
    const serverOnly = {
      [ZKLOGIN_ENV_KEYS.canonicalClientId]: CANONICAL,
      [ZKLOGIN_ENV_KEYS.legacyClientIds]: LEGACY,
      [ZKLOGIN_ENV_KEYS.legacyClientIdPublic]: "",
    };
    expect(isBrowserLegacyRecoveryAvailable(serverOnly)).toBe(false);
    expect(getTrustedGoogleAudiences(serverOnly)).toContain(LEGACY);
  });

  it("enables server recovery when only public legacy client is configured", () => {
    const publicOnly = {
      [ZKLOGIN_ENV_KEYS.canonicalClientId]: CANONICAL,
      [ZKLOGIN_ENV_KEYS.legacyClientIdPublic]: LEGACY,
      [ZKLOGIN_ENV_KEYS.legacyClientIds]: "",
    };
    expect(isBrowserLegacyRecoveryAvailable(publicOnly)).toBe(true);
    expect(isTrustedGoogleAudience(LEGACY, publicOnly)).toBe(true);
    expect(getTrustedGoogleAudiences(publicOnly)).toContain(LEGACY);
  });

  it("disables server recovery hint when public and server legacy client ids disagree", () => {
    const mismatched = {
      [ZKLOGIN_ENV_KEYS.canonicalClientId]: CANONICAL,
      [ZKLOGIN_ENV_KEYS.legacyClientIdPublic]: LEGACY,
      [ZKLOGIN_ENV_KEYS.legacyClientIds]: OTHER_LEGACY,
    };
    expect(isBrowserLegacyRecoveryAvailable(mismatched)).toBe(false);
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
