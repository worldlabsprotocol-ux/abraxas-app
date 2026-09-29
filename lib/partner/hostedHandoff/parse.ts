// FILE: lib/partner/hostedHandoff/parse.ts

import {
  HOSTED_HANDOFF_ALLOWED_KEYS,
  HOSTED_HANDOFF_FORBIDDEN_KEYS,
  HOSTED_HANDOFF_RUNTIMES,
  type HostedHandoffRuntime,
} from "./contract";

export function parseHandoffCreateBody(body: unknown):
  | { ok: true; runtime: HostedHandoffRuntime; binding_id: string | null }
  | { ok: false; code: string } {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, code: "invalid_input" };
  }
  const record = body as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    if ((HOSTED_HANDOFF_FORBIDDEN_KEYS as readonly string[]).includes(key)) {
      return { ok: false, code: "client_override_rejected" };
    }
    if (!(HOSTED_HANDOFF_ALLOWED_KEYS as readonly string[]).includes(key)) {
      return { ok: false, code: "unknown_field" };
    }
  }
  const runtime = typeof record.runtime === "string" ? record.runtime : "universal_https";
  if (!(HOSTED_HANDOFF_RUNTIMES as readonly string[]).includes(runtime)) {
    return { ok: false, code: "runtime_rejected" };
  }
  const bindingId = typeof record.binding_id === "string" && record.binding_id.trim()
    ? record.binding_id.trim()
    : null;
  return { ok: true, runtime: runtime as HostedHandoffRuntime, binding_id: bindingId };
}
