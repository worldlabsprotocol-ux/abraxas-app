// FILE: lib/institutional/mandate/canonical.ts

import { createHash } from "node:crypto";
import { canonicalizeJson } from "@/lib/decisionReceipts/canonical";
import type { InstitutionalMandatePayload } from "./contract";

export function hashInstitutionalMandatePayload(payload: InstitutionalMandatePayload): string {
  const canonical = canonicalizeJson(payload);
  return createHash("sha256").update(canonical, "utf8").digest("hex");
}
