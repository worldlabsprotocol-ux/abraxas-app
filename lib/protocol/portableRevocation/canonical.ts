// FILE: lib/protocol/portableRevocation/canonical.ts

import { createHash } from "node:crypto";
import { canonicalizeJson } from "@/lib/decisionReceipts/canonical";
import type { PortableRevocationPayload } from "./contract";

export function hashPortableRevocationPayload(payload: PortableRevocationPayload): string {
  const canonical = canonicalizeJson(payload);
  return createHash("sha256").update(canonical, "utf8").digest("hex");
}
