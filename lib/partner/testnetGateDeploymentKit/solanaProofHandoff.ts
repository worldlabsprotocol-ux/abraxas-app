// Resolve a completed, partner-scoped handoff to a consent-bound receipt without browser or admin access.
type LookupFetch = (url: string, init: RequestInit) => Promise<Response>;

export type ReceiptResolution =
  | { ok: true; receiptId: string }
  | { ok: false; reason: string };

const RECEIPT_ID = /^dr_[A-Za-z0-9_-]{3,125}$/;
const HANDOFF_REF = /^hpf_[0-9a-f]{16}$/;

export async function resolveInstitutionalReceiptInput(
  reference: string,
  applicationId: string,
  partnerKey: string,
  fetcher: LookupFetch = fetch,
): Promise<ReceiptResolution> {
  if (RECEIPT_ID.test(reference)) return { ok: true, receiptId: reference };
  if (!HANDOFF_REF.test(reference)) return { ok: false, reason: "invalid_receipt_or_handoff_ref" };

  let response: Response;
  try {
    response = await fetcher(`https://demo.abraxasworld.xyz/api/v1/partner-handoff/${encodeURIComponent(reference)}`, {
      method: "GET",
      redirect: "error",
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
      headers: { authorization: `Bearer ${partnerKey}` },
    });
  } catch {
    return { ok: false, reason: "handoff_lookup_unavailable" };
  }
  if (!response.ok) return { ok: false, reason: `handoff_lookup_http_${response.status}` };

  let data: Record<string, unknown>;
  try {
    data = await response.json() as Record<string, unknown>;
  } catch {
    return { ok: false, reason: "handoff_lookup_invalid_response" };
  }
  if (data.ok !== true
    || data.application_id !== applicationId
    || data.environment !== "sandbox"
    || data.action !== "activate_protocol_access"
    || data.policy_version !== 1) {
    return { ok: false, reason: "handoff_binding_mismatch" };
  }
  if (data.status !== "completed" && data.status !== "consumed") {
    return { ok: false, reason: "handoff_not_completed" };
  }
  if (typeof data.public_receipt_id !== "string" || !RECEIPT_ID.test(data.public_receipt_id)) {
    return { ok: false, reason: "handoff_receipt_unavailable" };
  }
  return { ok: true, receiptId: data.public_receipt_id };
}
