// FILE: lib/partner/returnUrlAllowlist.ts
// Partner return URL validation — wraps Connect allowlist for relying-party flows.

export { isReturnUrlAllowed, buildRedirectUrl } from "@/lib/connect/returnUrlAllowlist";

import { isReturnUrlAllowed } from "@/lib/connect/returnUrlAllowlist";

export async function isAllowedPartnerReturnUrl(
  partnerId: string,
  returnUrl: string,
): Promise<boolean> {
  return isReturnUrlAllowed(partnerId, returnUrl);
}
