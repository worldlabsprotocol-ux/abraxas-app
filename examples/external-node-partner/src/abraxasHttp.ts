/**
 * Public Abraxas Partner Flow HTTP surface — no Abraxas repository imports.
 */

export type CreateHandoffResult =
  | {
      ok: true;
      hosted_url: string;
      verify_request: string;
      handoff_ref: string;
    }
  | { ok: false; status: number; error: string };

export async function createHostedHandoff(input: {
  baseUrl: string;
  apiKey: string;
  applicationId: string;
  bindingId?: string | null;
  runtime?: string;
  fetchFn?: typeof fetch;
}): Promise<CreateHandoffResult> {
  const fetchFn = input.fetchFn ?? fetch;
  const res = await fetchFn(`${input.baseUrl}/api/v1/partner-handoff`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${input.apiKey}`,
      "content-type": "application/json",
      "x-abraxas-application-id": input.applicationId,
    },
    body: JSON.stringify({
      runtime: input.runtime ?? "universal_https",
      ...(input.bindingId ? { binding_id: input.bindingId } : {}),
    }),
  });
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    return { ok: false, status: res.status, error: String(body.error ?? "handoff_create_failed") };
  }
  const hosted_url = body.hosted_url;
  const verify_request = body.verify_request;
  const handoff_ref = body.handoff_ref;
  if (typeof hosted_url !== "string" || typeof verify_request !== "string" || typeof handoff_ref !== "string") {
    return { ok: false, status: 502, error: "handoff_response_incomplete" };
  }
  return { ok: true, hosted_url, verify_request, handoff_ref };
}

import type {
  DecisionReceiptRecord,
  SignedIssuerAuthorityStatement,
  SignedReceiptStatusStatement,
  TrustAnchorBundleV1,
} from "@abraxas/independent-verifier";

export type PortableBundle = {
  decision_receipt: DecisionReceiptRecord;
  bundled_trust_anchor: TrustAnchorBundleV1;
  signed_issuer_authority: SignedIssuerAuthorityStatement;
  signed_status_statement: SignedReceiptStatusStatement;
  registry_version: number;
};

export async function fetchPortableVerificationBundle(input: {
  baseUrl: string;
  receiptId: string;
  fetchFn?: typeof fetch;
}): Promise<{ ok: true; bundle: PortableBundle } | { ok: false; status: number; error: string }> {
  const fetchFn = input.fetchFn ?? fetch;
  const res = await fetchFn(
    `${input.baseUrl}/api/receipts/${encodeURIComponent(input.receiptId)}/portable-verification`,
    { headers: { accept: "application/json" }, cache: "no-store" },
  );
  if (!res.ok) {
    const text = await res.text();
    return { ok: false, status: res.status, error: text.slice(0, 200) || "portable_fetch_failed" };
  }
  const json = (await res.json()) as { ok?: boolean; bundle?: PortableBundle };
  if (!json.ok || !json.bundle) return { ok: false, status: 502, error: "portable_bundle_missing" };
  return { ok: true, bundle: json.bundle };
}
