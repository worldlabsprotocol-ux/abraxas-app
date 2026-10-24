// FILE: lib/persistence/boundary/issuerAuthority/canonical.ts

import { createHash } from "node:crypto";
import { canonicalizeJson } from "@/lib/decisionReceipts/canonical";
import type { IssuerAuthorityStatementPayload } from "./contract";

export function hashIssuerAuthorityPayload(payload: IssuerAuthorityStatementPayload): string {
  const canonical = canonicalizeJson(payload);
  return createHash("sha256").update(canonical, "utf8").digest("hex");
}
