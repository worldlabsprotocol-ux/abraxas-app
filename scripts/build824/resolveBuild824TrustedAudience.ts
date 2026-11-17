// FILE: scripts/build824/resolveBuild824TrustedAudience.ts
// Trusted integrator audience — never read expected partner/policy from portable bundle JSON.

import {
  BUILD823_DEMO_PARTNER_ID,
  BUILD823_DEMO_POLICY_ID,
  BUILD823_DEMO_RECEIPT_ID,
} from "@/lib/partner/portableIndependentVerification/fixtures/build823DemoReceipt.fixture";

export type Build824TrustedAudienceSource = "integrator_env" | "demo_fixture" | "public_receipt_api";

export type Build824TrustedAudience = {
  partner_id: string;
  policy_id: string;
  source: Build824TrustedAudienceSource;
};

export function build824TrustedAudienceFromEnv(
  env: Record<string, string | undefined> = process.env,
): Build824TrustedAudience | null {
  const partner_id = env.ABRAXAS_BUILD824_EXPECTED_PARTNER_ID?.trim();
  const policy_id = env.ABRAXAS_BUILD824_EXPECTED_POLICY_ID?.trim();
  if (!partner_id || !policy_id) return null;
  return { partner_id, policy_id, source: "integrator_env" };
}

export function build824TrustedAudienceForReceiptId(
  receiptId: string,
): Build824TrustedAudience | null {
  if (receiptId === BUILD823_DEMO_RECEIPT_ID) {
    return {
      partner_id: BUILD823_DEMO_PARTNER_ID,
      policy_id: BUILD823_DEMO_POLICY_ID,
      source: "demo_fixture",
    };
  }
  return null;
}

export type PublicReceiptAudienceRow = {
  partner_id?: string | null;
  policy_id?: string | null;
};

export function build824TrustedAudienceFromPublicReceipt(
  row: PublicReceiptAudienceRow,
): Build824TrustedAudience | { error: string } {
  const partner_id = row.partner_id?.trim() ?? "";
  const policy_id = row.policy_id?.trim() ?? "";
  if (!partner_id || !policy_id) {
    return { error: "public_receipt_audience_unavailable" };
  }
  return { partner_id, policy_id, source: "public_receipt_api" };
}

export async function resolveBuild824TrustedAudience(input: {
  demoBase: string;
  receiptId: string;
  env?: Record<string, string | undefined>;
  fetchFn?: typeof fetch;
}): Promise<Build824TrustedAudience | { error: string }> {
  const env = input.env ?? process.env;
  const fromEnv = build824TrustedAudienceFromEnv(env);
  if (fromEnv) return fromEnv;

  const fromFixture = build824TrustedAudienceForReceiptId(input.receiptId);
  if (fromFixture) return fromFixture;

  const fetchImpl = input.fetchFn ?? fetch;
  const url = `${input.demoBase.replace(/\/$/, "")}/api/receipts/${encodeURIComponent(input.receiptId)}/public`;
  const res = await fetchImpl(url, { headers: { Accept: "application/json" }, cache: "no-store" });
  if (!res.ok) {
    return { error: `public_receipt_http_${res.status}` };
  }
  const row = (await res.json()) as PublicReceiptAudienceRow;
  return build824TrustedAudienceFromPublicReceipt(row);
}