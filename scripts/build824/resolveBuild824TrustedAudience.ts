// FILE: scripts/build824/resolveBuild824TrustedAudience.ts
// Trusted integrator audience — never read expected partner/policy from portable bundle JSON
// or from the public receipt API (public data may verify against pins, not establish them).

import {
  BUILD823_DEMO_PARTNER_ID,
  BUILD823_DEMO_POLICY_ID,
  BUILD823_DEMO_RECEIPT_ID,
} from "@/lib/partner/portableIndependentVerification/fixtures/build823DemoReceipt.fixture";

export type Build824TrustedAudienceSource = "integrator_env" | "demo_fixture_synthetic";

export type Build824TrustedAudience = {
  partner_id: string;
  policy_id: string;
  source: Build824TrustedAudienceSource;
  /** Teaching fixture only — not live sandbox authority. */
  synthetic?: boolean;
};

export const BUILD824_TRUSTED_AUDIENCE_CONFIGURATION_REQUIRED =
  "trusted_audience_configuration_required" as const;

export function build824TrustedAudienceFromEnv(
  env: Record<string, string | undefined> = process.env,
): Build824TrustedAudience | null {
  const partner_id = env.ABRAXAS_BUILD824_EXPECTED_PARTNER_ID?.trim();
  const policy_id = env.ABRAXAS_BUILD824_EXPECTED_POLICY_ID?.trim();
  if (!partner_id || !policy_id) return null;
  return { partner_id, policy_id, source: "integrator_env" };
}

/** Known teaching receipt — synthetic pins for offline/registry demos, not sandbox provisioning authority. */
export function build824TrustedAudienceForReceiptId(
  receiptId: string,
): Build824TrustedAudience | null {
  if (receiptId === BUILD823_DEMO_RECEIPT_ID) {
    return {
      partner_id: BUILD823_DEMO_PARTNER_ID,
      policy_id: BUILD823_DEMO_POLICY_ID,
      source: "demo_fixture_synthetic",
      synthetic: true,
    };
  }
  return null;
}

export function resolveBuild824TrustedAudience(input: {
  receiptId: string;
  env?: Record<string, string | undefined>;
}): Build824TrustedAudience | { error: typeof BUILD824_TRUSTED_AUDIENCE_CONFIGURATION_REQUIRED } {
  const env = input.env ?? process.env;
  const fromEnv = build824TrustedAudienceFromEnv(env);
  if (fromEnv) return fromEnv;

  const fromFixture = build824TrustedAudienceForReceiptId(input.receiptId);
  if (fromFixture) return fromFixture;

  return { error: BUILD824_TRUSTED_AUDIENCE_CONFIGURATION_REQUIRED };
}