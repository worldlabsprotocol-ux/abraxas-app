// FILE: lib/privacy/auditorDisclosure/canonical.ts

import { createHash } from "node:crypto";
import { canonicalizeJson } from "@/lib/decisionReceipts/canonical";
import type { AuditorDisclosureMandatePayload } from "./contract";

export function hashAuditorDisclosureMandatePayload(payload: AuditorDisclosureMandatePayload): string {
  const canonical = canonicalizeJson(payload);
  return createHash("sha256").update(canonical, "utf8").digest("hex");
}