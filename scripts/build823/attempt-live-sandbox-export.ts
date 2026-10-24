#!/usr/bin/env npx tsx
/**
 * Build #823 — probe live Demo sandbox export for genuine receipt dr_jSXuDfM_pFMT36du.
 * Read-only; does not mutate issuance or publish Production trust anchors.
 */

import { BUILD823_DEMO_RECEIPT_ID } from "../../lib/partner/portableIndependentVerification/fixtures/build823DemoReceipt.fixture";

const DEMO_BASE = process.env.ABRAXAS_BUILD823_DEMO_BASE_URL?.trim() ?? "https://demo.abraxasworld.xyz";

async function main() {
  const receiptId = process.env.ABRAXAS_BUILD823_RECEIPT_ID?.trim() ?? BUILD823_DEMO_RECEIPT_ID;
  const publicUrl = `${DEMO_BASE}/api/receipts/${encodeURIComponent(receiptId)}/public`;
  const portableUrl = `${DEMO_BASE}/api/receipts/${encodeURIComponent(receiptId)}/portable-verification`;

  const report: Record<string, unknown> = {
    build: "823",
    demo_base: DEMO_BASE,
    receipt_id: receiptId,
    probed_at: new Date().toISOString(),
  };

  const publicRes = await fetch(publicUrl, { headers: { Accept: "application/json" }, cache: "no-store" });
  report.public_http_status = publicRes.status;
  if (publicRes.ok) {
    const body = (await publicRes.json()) as Record<string, unknown>;
    report.public_has_verification_decision_id = Boolean(body.verification_decision_id);
    report.public_signing_key_id = body.signing_key_id;
    report.public_payload_hash = body.payload_hash;
    report.public_expires_at = body.expires_at;
  }

  const portableRes = await fetch(portableUrl, { headers: { Accept: "application/json" }, cache: "no-store" });
  report.portable_http_status = portableRes.status;
  const contentType = portableRes.headers.get("content-type") ?? "";
  report.portable_content_type = contentType;
  if (contentType.includes("application/json")) {
    const body = (await portableRes.json()) as { ok?: boolean; error?: string; gaps?: string[] };
    report.portable_body = body;
  } else {
    report.portable_body_preview = (await portableRes.text()).slice(0, 200);
  }

  console.log(JSON.stringify(report, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
