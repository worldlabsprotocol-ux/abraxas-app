import { describe, expect, it } from "vitest";
import {
  classifyGoogleAudience,
  getTrustedGoogleAudiences,
  isLegacyRecoveryConfigured,
  isTrustedGoogleAudience,
  parseLegacyGoogleClientIds,
  resolveOAuthClientIdForMode,
  ZKLOGIN_ENV_KEYS,
} from "./audienceCohorts";

const CANONICAL = "540000000000-newclient.apps.googleusercontent.com";
const LEGACY = "187000000000-legacyclient.apps.googleusercontent.com";

describe("audienceCohorts", () => {
  const baseEnv = {
    [ZKLOGIN_ENV_KEYS.canonicalClientIdPublic]: CANONICAL,
    [ZKLOGIN_ENV_KEYS.legacyClientIdPublic]: LEGACY,
    [ZKLOGIN_ENV_KEYS.legacyClientIds]: "",
  };

  it("includes canonical and legacy audiences in trusted set", () => {
    const trusted = getTrustedGoogleAudiences(baseEnv);
    expect(trusted).toContain(CANONICAL);
    expect(trusted).toContain(LEGACY);
    expect(trusted).toHaveLength(2);
  });

  it("classifies canonical vs legacy cohorts", () => {
    expect(classifyGoogleAudience(CANONICAL, baseEnv)).toBe("canonical");
    expect(classifyGoogleAudience(LEGACY, baseEnv)).toBe("legacy");
    expect(classifyGoogleAudience("evil-client.apps.googleusercontent.com", baseEnv)).toBe("untrusted");
  });

  it("rejects untrusted audience", () => {
    expect(isTrustedGoogleAudience("evil-client.apps.googleusercontent.com", baseEnv)).toBe(false);
  });

  it("resolves OAuth client id per login mode", () => {
    expect(resolveOAuthClientIdForMode("canonical", baseEnv)).toBe(CANONICAL);
    expect(resolveOAuthClientIdForMode("legacy_recovery", baseEnv)).toBe(LEGACY);
  });

  it("parses comma-separated legacy client ids from server env", () => {
    const ids = parseLegacyGoogleClientIds({
      ...baseEnv,
      [ZKLOGIN_ENV_KEYS.legacyClientIds]: `${LEGACY},legacy-two.apps.googleusercontent.com`,
      [ZKLOGIN_ENV_KEYS.legacyClientIdPublic]: "",
    });
    expect(ids).toEqual([LEGACY, "legacy-two.apps.googleusercontent.com"]);
  });

  it("detects legacy recovery configuration", () => {
    expect(isLegacyRecoveryConfigured(baseEnv)).toBe(true);
    expect(isLegacyRecoveryConfigured({ [ZKLOGIN_ENV_KEYS.canonicalClientIdPublic]: CANONICAL })).toBe(false);
  });
});
