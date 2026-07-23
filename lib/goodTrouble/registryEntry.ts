// FILE: lib/goodTrouble/registryEntry.ts
// Good Trouble — asset registry + integration registry bridge.

import { GOOD_TROUBLE_BRAND, GOOD_TROUBLE_INTEGRATION_PATH, GOOD_TROUBLE_PARTNER_ID } from "@/lib/goodTrouble/constants";

export const GOOD_TROUBLE_REGISTRY_IMAGE = "/assets/good-trouble/brand-card.svg";

export const GOOD_TROUBLE_ASSET = {
  id: "ABX-CNB-GT-008",
  slug: "good-trouble-cannabis",
  name: `${GOOD_TROUBLE_BRAND.name} · Batch Provenance`,
  owner: GOOD_TROUBLE_BRAND.legalName,
  location: GOOD_TROUBLE_BRAND.location,
  image: GOOD_TROUBLE_REGISTRY_IMAGE,
  caseStudyPath: GOOD_TROUBLE_INTEGRATION_PATH,
  verifyPath: "/verify/ABX-CNB-GT-008",
  partnerId: GOOD_TROUBLE_PARTNER_ID,
} as const;
