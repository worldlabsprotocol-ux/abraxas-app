// FILE: lib/passport/reusableCredential/institutionalConsentBinding.ts

import { createHash } from "crypto";
import { canonicalizeJson } from "@/lib/decisionReceipts/canonical";

export type InstitutionalConsentBinding = {
  holder_subject_id: string;
  credential_id: string;
  partner_id: string;
  policy_id: string;
  policy_version: number;
  requested_attribute: string;
};

export function hashInstitutionalConsentBinding(binding: InstitutionalConsentBinding): string {
  const canonical = canonicalizeJson(binding);
  return createHash("sha256").update(canonical, "utf8").digest("hex");
}
