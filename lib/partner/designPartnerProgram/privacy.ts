// FILE: lib/partner/designPartnerProgram/privacy.ts

import { valueEvidenceLeaks } from "@/lib/partner/valueEvidence/privacy";

export function designPartnerLeaks(payload: unknown): string[] {
  return valueEvidenceLeaks(payload);
}
