// Canonical issuer authority change document constants (no persistence imports).

import { canonicalizeJson } from "@abraxas/independent-verifier";
import { createHash } from "node:crypto";

export const INITIAL_ISSUER_REGISTRY_VERSION = 854;
export const ISSUER_AUTHORITY_CHANGE_DOCUMENT = "abraxas_issuer_authority_change/1.0.0" as const;

export type IssuerAuthorityChangeAuthorization = {
  document: typeof ISSUER_AUTHORITY_CHANGE_DOCUMENT;
  environment: "demo" | "production";
  change: "bootstrap" | "authority_change";
  registry_version: number;
  supersedes_registry_version: number | null;
  authority_state_digest: string;
  anchor_key_id: string;
  anchor_fingerprint: string;
};

export function hashIssuerAuthorityChangeAuthorization(
  authorization: IssuerAuthorityChangeAuthorization,
): string {
  return createHash("sha256").update(canonicalizeJson(authorization), "utf8").digest("hex");
}
