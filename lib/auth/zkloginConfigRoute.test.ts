import { describe, expect, it } from "vitest";
import { GET } from "@/app/api/auth/zklogin/config/route";
import { ZKLOGIN_ENV_KEYS } from "@/lib/sui/zklogin/audienceCohorts";

describe("GET /api/auth/zklogin/config", () => {
  it("reports legacy recovery unavailable when only public legacy client is configured", async () => {
    const env = {
      [ZKLOGIN_ENV_KEYS.canonicalClientId]: "canonical.apps.googleusercontent.com",
      [ZKLOGIN_ENV_KEYS.legacyClientIdPublic]: "legacy.apps.googleusercontent.com",
      [ZKLOGIN_ENV_KEYS.legacyClientIds]: "",
    };

    const original = { ...process.env };
    Object.assign(process.env, env);

    const res = await GET();
    const json = await res.json() as {
      canonical_server_configured: boolean;
      legacy_server_configured: boolean;
      legacy_recovery_available: boolean;
    };

    Object.assign(process.env, original);

    expect(json.canonical_server_configured).toBe(true);
    expect(json.legacy_server_configured).toBe(false);
    expect(json.legacy_recovery_available).toBe(false);
  });

  it("reports legacy recovery available when public and server legacy allowlists align", async () => {
    const env = {
      [ZKLOGIN_ENV_KEYS.canonicalClientId]: "canonical.apps.googleusercontent.com",
      [ZKLOGIN_ENV_KEYS.legacyClientIdPublic]: "legacy.apps.googleusercontent.com",
      [ZKLOGIN_ENV_KEYS.legacyClientIds]: "legacy.apps.googleusercontent.com",
    };

    const original = { ...process.env };
    Object.assign(process.env, env);

    const res = await GET();
    const json = await res.json() as { legacy_recovery_available: boolean };

    Object.assign(process.env, original);

    expect(json.legacy_recovery_available).toBe(true);
  });
});
