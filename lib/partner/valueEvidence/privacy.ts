// FILE: lib/partner/valueEvidence/privacy.ts
// Value layer leak detection — extends pilot evidence checks.

import { pilotEvidenceLeaks } from "@/lib/partner/pilotEvidence/export";

export function valueEvidenceLeaks(payload: unknown): string[] {
  return pilotEvidenceLeaks(payload);
}
