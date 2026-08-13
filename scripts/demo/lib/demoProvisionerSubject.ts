// FILE: scripts/demo/lib/demoProvisionerSubject.ts
// Opaque UUID provisioning identity and deterministic synthetic Sui-shaped subject.

import { createHash, randomUUID } from "node:crypto";
import { normalizeSuiAddress } from "@mysten/sui/utils";

const UUID_V4_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidProvisionId(value: string): boolean {
  return UUID_V4_PATTERN.test(value.trim());
}

export function generateProvisionId(): string {
  return randomUUID();
}

export function deriveSubjectIdFromProvisionId(provisionId: string): string {
  const normalized = provisionId.trim().toLowerCase();
  if (!isValidProvisionId(normalized)) {
    throw new Error("provision_id must be a UUID v4");
  }
  const digest = createHash("sha256").update(normalized, "utf8").digest("hex");
  return normalizeSuiAddress(`0x${digest}`);
}

export function assertProvisionIdFormat(provisionId: string): string {
  const trimmed = provisionId.trim();
  if (!isValidProvisionId(trimmed)) {
    throw new Error("provision_id must be a UUID v4");
  }
  return trimmed.toLowerCase();
}
