// FILE: lib/partner/partnerVerifyPreview.test.ts

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  isPartnerVerifyPreviewControlsEnabled,
  resolvePartnerVerifyPreviewPhase,
  resolvePartnerVerifyPreviewSignInConfigured,
} from "./partnerVerifyPreview";

describe("partnerVerifyPreview server gate", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("is disabled in production even when preview env is set", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("PARTNER_VERIFY_PREVIEW_CONTROLS", "1");
    expect(isPartnerVerifyPreviewControlsEnabled()).toBe(false);
    expect(resolvePartnerVerifyPreviewPhase({ preview_phase: "signing_in" }, false)).toBeNull();
    expect(resolvePartnerVerifyPreviewSignInConfigured({ preview_signin_configured: "1" }, false)).toBe(false);
  });

  it("requires explicit server env outside production", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("PARTNER_VERIFY_PREVIEW_CONTROLS", "");
    expect(isPartnerVerifyPreviewControlsEnabled()).toBe(false);
  });

  it("allows preview only when server gate is enabled", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("PARTNER_VERIFY_PREVIEW_CONTROLS", "1");
    expect(isPartnerVerifyPreviewControlsEnabled()).toBe(true);
    expect(resolvePartnerVerifyPreviewPhase({ preview_phase: "signing_in" }, true)).toBe("signing_in");
    expect(resolvePartnerVerifyPreviewSignInConfigured({ preview_signin_configured: "1" }, true)).toBe(true);
  });
});
