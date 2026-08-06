import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import {
  getClientCanonicalGoogleClientId,
  getClientLegacyGoogleClientId,
  isClientLegacyRecoveryConfigured,
  isClientZkLoginConfigured,
  resolveClientOAuthClientIdForMode,
} from "./clientEnv";

const ROOT = join(__dirname, "..", "..", "..");

describe("clientEnv — Next.js public env inlining", () => {
  const saved = { ...process.env };

  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_GOOGLE_ZKLOGIN_CLIENT_ID;
    delete process.env.NEXT_PUBLIC_GOOGLE_ZKLOGIN_LEGACY_CLIENT_ID;
  });

  afterEach(() => {
    process.env = { ...saved };
  });

  it("uses direct static NEXT_PUBLIC property access in source", () => {
    const src = readFileSync(join(__dirname, "clientEnv.ts"), "utf8");
    expect(src).toContain("process.env.NEXT_PUBLIC_GOOGLE_ZKLOGIN_CLIENT_ID");
    expect(src).toContain("process.env.NEXT_PUBLIC_GOOGLE_ZKLOGIN_LEGACY_CLIENT_ID");
    expect(src).not.toMatch(/process\.env\[[^\]]*NEXT_PUBLIC/);
  });

  it("reports canonical configured when NEXT_PUBLIC_GOOGLE_ZKLOGIN_CLIENT_ID is set", () => {
    process.env.NEXT_PUBLIC_GOOGLE_ZKLOGIN_CLIENT_ID = "canonical-client.apps.googleusercontent.com";
    expect(getClientCanonicalGoogleClientId()).toBe("canonical-client.apps.googleusercontent.com");
    expect(isClientZkLoginConfigured()).toBe(true);
    expect(resolveClientOAuthClientIdForMode("canonical")).toBe(
      "canonical-client.apps.googleusercontent.com",
    );
  });

  it("reports legacy recovery configured when public legacy client id is set", () => {
    process.env.NEXT_PUBLIC_GOOGLE_ZKLOGIN_LEGACY_CLIENT_ID = "legacy-client.apps.googleusercontent.com";
    expect(getClientLegacyGoogleClientId()).toBe("legacy-client.apps.googleusercontent.com");
    expect(isClientLegacyRecoveryConfigured()).toBe(true);
    expect(resolveClientOAuthClientIdForMode("legacy_recovery")).toBe(
      "legacy-client.apps.googleusercontent.com",
    );
  });

  it("does not read server-only legacy allowlist env vars", () => {
    const src = readFileSync(join(__dirname, "clientEnv.ts"), "utf8");
    expect(src).not.toContain("GOOGLE_ZKLOGIN_LEGACY_CLIENT_IDS");
    expect(src).not.toMatch(/process\.env\.GOOGLE_ZKLOGIN_CLIENT_ID\b/);
  });
});
