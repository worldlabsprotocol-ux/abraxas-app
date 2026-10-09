import { describe, expect, it, beforeEach } from "vitest";
import {
  PKCE_ESCROW_PEPPER_SECRET_NAME,
  fetchPkceEscrowPepper,
  validatePkceEscrowPepperSecret,
} from "./pkceEscrowPepper.js";
import { loadPkceEscrowPepperFromWixSecrets } from "./pkceEscrowPepperWix.js";
import {
  __testOnlyClearWixSecrets,
  __testOnlySetWixSecret,
} from "wix-secrets-backend";
import { TEST_ESCROW_PEPPER_HEX } from "./testPkceEscrowFixtures.js";

beforeEach(() => {
  __testOnlyClearWixSecrets();
});

describe("validatePkceEscrowPepperSecret", () => {
  it("accepts 32-byte hex pepper", () => {
    const result = validatePkceEscrowPepperSecret(TEST_ESCROW_PEPPER_HEX);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.pepper).toBe(TEST_ESCROW_PEPPER_HEX);
  });

  it("rejects missing pepper", () => {
    expect(validatePkceEscrowPepperSecret("").code).toBe("pkce_escrow_secret_missing");
  });

  it("rejects short pepper", () => {
    expect(validatePkceEscrowPepperSecret("too-short").code).toBe("pkce_escrow_secret_invalid");
  });
});

describe("fetchPkceEscrowPepper", () => {
  it("returns unavailable when getSecret is not provided", async () => {
    const result = await fetchPkceEscrowPepper({});
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("pkce_escrow_secret_unavailable");
  });

  it("returns invalid when Wix secret value is too short", async () => {
    const result = await fetchPkceEscrowPepper({
      getSecret: async () => "short",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("pkce_escrow_secret_invalid");
  });

  it("returns missing when secret value is empty", async () => {
    const result = await fetchPkceEscrowPepper({
      getSecret: async () => "   ",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("pkce_escrow_secret_missing");
  });

  it("loads valid pepper via getSecret (Wix Secrets Manager shape)", async () => {
    const result = await fetchPkceEscrowPepper({
      getSecret: async (name) => {
        expect(name).toBe(PKCE_ESCROW_PEPPER_SECRET_NAME);
        return TEST_ESCROW_PEPPER_HEX;
      },
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.pepper).toBe(TEST_ESCROW_PEPPER_HEX);
  });

  it("loadPkceEscrowPepperFromWixSecrets uses wix-secrets-backend getSecret", async () => {
    __testOnlySetWixSecret(PKCE_ESCROW_PEPPER_SECRET_NAME, TEST_ESCROW_PEPPER_HEX);
    const result = await loadPkceEscrowPepperFromWixSecrets();
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.pepper).toBe(TEST_ESCROW_PEPPER_HEX);
  });
});
