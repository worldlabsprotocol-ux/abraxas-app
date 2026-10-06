// FILE: lib/provenance/partnerFlow.ts
// Content provenance partner-flow detection helpers.

import {
  CONTENT_ORIGIN_DISCLOSURE_PACK_ID,
  isContentOriginDisclosurePolicyId,
} from "./constants";

export {
  CONTENT_ORIGIN_DISCLOSURE_PACK_ID,
  isContentOriginDisclosurePolicyId,
};

export function isContentOriginDisclosureFlow(input: {
  policyId: string;
}): boolean {
  return isContentOriginDisclosurePolicyId(input.policyId);
}
