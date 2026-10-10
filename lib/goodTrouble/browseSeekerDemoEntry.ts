// FILE: lib/goodTrouble/browseSeekerDemoEntry.ts
// Browse-first Solana Seeker demo — genuine Wix Partner Flow entry (L0 browse, not purchase).

import {
  GOOD_TROUBLE_BRAND,
  GOOD_TROUBLE_BROWSE_POLICY_ID,
  GOOD_TROUBLE_PARTNER_ID,
} from "@/lib/goodTrouble/constants";

/** Live Good Trouble site — age gate `#abraxasButton` starts Wix browse Partner Flow. */
export const GOOD_TROUBLE_WIX_BROWSE_DEMO_ENTRY_URL = `${GOOD_TROUBLE_BRAND.website}` as const;

export const GOOD_TROUBLE_BROWSE_SEEKER_DEMO = {
  entryUrl: GOOD_TROUBLE_WIX_BROWSE_DEMO_ENTRY_URL,
  entryLabel: "Open Good Trouble (browse demo)",
  partnerId: GOOD_TROUBLE_PARTNER_ID,
  policyId: GOOD_TROUBLE_BROWSE_POLICY_ID,
  purpose: "browse" as const,
  callbackPath: "/browse-verification-result",
  postVerificationPath: "/goods",
  assurance: "L0 self-attestation (catalog browse only — not regulated checkout)",
  purchaseDemoPath: "/good-trouble/checkout",
} as const;
