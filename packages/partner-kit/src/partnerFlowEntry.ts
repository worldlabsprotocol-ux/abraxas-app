import { DEFAULT_ABRAXAS_BASE_URL } from "./defaults.js";

export function buildPartnerFlowEntryUrl(input: {
  partnerId: string;
  policyId: string;
  returnUrl: string;
  origin?: string;
  purpose?: string;
  expectedContentHash?: string | null;
  appSlug?: string | null;
}): string {
  const base = (input.origin ?? DEFAULT_ABRAXAS_BASE_URL).replace(/\/$/, "");
  const params = new URLSearchParams();
  if (input.appSlug?.trim()) {
    params.set("app", input.appSlug.trim());
  } else {
    params.set("partner_id", input.partnerId);
    params.set("policy_id", input.policyId);
  }
  params.set("return_url", input.returnUrl);
  if (input.purpose?.trim()) params.set("purpose", input.purpose.trim());
  if (input.expectedContentHash?.trim()) {
    params.set("expected_content_hash", input.expectedContentHash.trim().toLowerCase());
  }
  return `${base}/partner/verify?${params.toString()}`;
}
