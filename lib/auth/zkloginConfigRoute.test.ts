import { describe, expect, it } from "vitest";
import { GET } from "@/app/api/auth/zklogin/config/route";
import { ZKLOGIN_ENV_KEYS } from "@/lib/sui/zklogin/audienceCohorts";

describe("GET /api/auth/zklogin/config", () => {
  it("reports legacy recovery available for aligned public-only legacy configuration", async () => {
    const env = {
      [ZKLOGIN_ENV_KEYS.canonicalClientId]: "canonical.apps.googleusercontent.com",
      [ZKLOGIN_ENV_KEYS.legacyClientIdPublic]: "legacy.apps.googleusercontent.com",
      [ZKLOGIN_ENV_KEYS.legacyClientIds]: "",
    };

    const original = { ...process.env };
    Object.assign(process.env, env);

    const res = await GET();
    const json = await res.json() as {
      canonical_configured: boolean;
      legacy_recovery_available: boolean;
      uses_public_legacy_fallback: boolean;
    };

    Object.assign(process.env, original);

    expect(json.canonical_configured).toBe(true);
    expect(json.legacy_recovery_available).toBe(true);
    expect(json.uses_public_legacy_fallback).toBe(true);
  });
});
