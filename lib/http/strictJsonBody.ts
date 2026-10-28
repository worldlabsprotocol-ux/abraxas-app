// FILE: lib/http/strictJsonBody.ts
// Fail-closed JSON body key validation for API contracts.

export type StrictBodyResult =
  | { ok: true; body: Record<string, unknown> }
  | { ok: false; code: "invalid_input" | "unknown_field"; extra?: string[] };

export function rejectUnknownJsonKeys(
  raw: unknown,
  allowedKeys: readonly string[],
): StrictBodyResult {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, code: "invalid_input" };
  }
  const body = raw as Record<string, unknown>;
  const allowed = new Set<string>(allowedKeys);
  const extra = Object.keys(body).filter((key) => !allowed.has(key));
  if (extra.length > 0) {
    return { ok: false, code: "unknown_field", extra };
  }
  return { ok: true, body };
}

/** Merge server-resolved fields after stripping extension keys (never drop security fields silently). */
export function stripExtensionKeys(
  body: Record<string, unknown>,
  extensionKeys: readonly string[],
): Record<string, unknown> {
  const out = { ...body };
  for (const key of extensionKeys) {
    delete out[key];
  }
  return out;
}
