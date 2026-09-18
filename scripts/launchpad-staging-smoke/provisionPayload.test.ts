// FILE: scripts/launchpad-staging-smoke/provisionPayload.test.ts

import { describe, expect, it } from "vitest";
import { isValidLaunchpadPublicSlug, slugifyLaunchpadApplication } from "@/lib/partner/launchpad/slug";
import {
  assertSmokeProvisionPayloadValid,
  buildSmokePartnerId,
  buildSmokeProvisionPayload,
} from "./provisionPayload";

describe("launchpad staging provision payload", () => {
  const testId = "launchpad-smoke-2026-09-16T13-40-11-540Z";
  const approvedReturnUrl =
    "https://abraxas-app-git-cursor-se-67cf03-worldlabsprotocol-uxs-projects.vercel.app";

  it("rejects the pre-fix harness slug that caused launchpad_invalid_input", () => {
    const legacyPartnerId = `${testId.replace(/[^a-z0-9-]/gi, "-").slice(0, 48)}`;
    const legacyPublicSlug = legacyPartnerId.slice(-32);

    expect(legacyPublicSlug).toBe("d-smoke-2026-09-16T13-40-11-540Z");
    expect(isValidLaunchpadPublicSlug(legacyPublicSlug)).toBe(false);
  });

  it("builds lowercase partner_id and server-derived slug compatible with RPC validation", () => {
    const payload = buildSmokeProvisionPayload({ testId, approvedReturnUrl });

    expect(payload.partner_id).toBe("launchpad-smoke-2026-09-16t13-40-11-540z");
    expect(payload).not.toHaveProperty("public_slug");

    const derivedSlug = slugifyLaunchpadApplication(payload.application_name);
    expect(isValidLaunchpadPublicSlug(derivedSlug)).toBe(true);
    assertSmokeProvisionPayloadValid(payload);
  });

  it("matches wizard partner_id derivation from application slugify", () => {
    expect(buildSmokePartnerId(testId)).toBe(slugifyLaunchpadApplication(testId));
  });
});
