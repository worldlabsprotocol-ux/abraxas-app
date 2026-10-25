const ALLOWED_KEYS = new Set([
  "receipt_id",
  "request_id",
  "decision",
  "status",
  "decision_id",
  "receipt_expires_at",
  "credential_id",
  "policy_id",
  "partner_id",
]);

export type ParsedCallback = {
  receipt_id: string;
  request_id: string | null;
};

export function parseCallbackQuery(search: URLSearchParams): { ok: true; params: ParsedCallback } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  for (const key of Array.from(search.keys())) {
    if (!ALLOWED_KEYS.has(key)) errors.push(`unknown_callback_param:${key}`);
  }
  const receipt_id = search.get("receipt_id")?.trim() ?? "";
  if (!receipt_id) errors.push("receipt_id_missing");
  if (errors.length) return { ok: false, errors };
  return {
    ok: true,
    params: {
      receipt_id,
      request_id: search.get("request_id")?.trim() || null,
    },
  };
}
