// FILE: lib/partner/hostedHandoff/handoffClientRequest.ts
// Canonical partner handoff create body (aligns with parseHandoffCreateBody).

import type { HostedHandoffRuntime } from "./contract";
import { HOSTED_HANDOFF_ALLOWED_KEYS } from "./contract";

export const PARTNER_HANDOFF_CREATE_BODY_KEYS = HOSTED_HANDOFF_ALLOWED_KEYS;

export function buildPartnerHandoffCreateRequestBody(input: {
  runtime?: HostedHandoffRuntime;
  bindingId?: string | null;
}): Record<string, unknown> {
  const body: Record<string, unknown> = {
    runtime: input.runtime ?? "universal_https",
  };
  if (input.bindingId?.trim()) {
    body.binding_id = input.bindingId.trim();
  }
  return body;
}

export function partnerHandoffClientKeysAreDocumented(): boolean {
  const sample = buildPartnerHandoffCreateRequestBody({ bindingId: "bind_1" });
  const keys = Object.keys(sample).sort();
  const allowed = [...PARTNER_HANDOFF_CREATE_BODY_KEYS].sort();
  const allowedSet = new Set<string>(allowed);
  return keys.every((k) => allowedSet.has(k)) && keys.length <= allowed.length;
}
