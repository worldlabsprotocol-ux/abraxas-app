#!/usr/bin/env npx tsx
/**
 * Build #824 — live Demo portable export + standalone verifier (read-only).
 */

import { verifyPortableBundle } from "../../lib/partner/portableIndependentVerification/verifyWithStandaloneVerifier";
import type { PortableVerificationBundle } from "../../lib/partner/portableIndependentVerification/buildPortableVerificationBundle";
import {
  BUILD823_DEMO_PARTNER_ID,
  BUILD823_DEMO_POLICY_ID,
  BUILD823_DEMO_RECEIPT_ID,
} from "../../lib/partner/portableIndependentVerification/fixtures/build823DemoReceipt.fixture";

const DEMO_BASE = process.env.ABRAXAS_BUILD824_DEMO_BASE_URL?.trim() ?? "https://demo.abraxasworld.xyz";
const RECEIPT_ID = process.env.ABRAXAS_BUILD824_RECEIPT_ID?.trim() ?? BUILD823_DEMO_RECEIPT_ID;

async function main() {
  const report: Record<string, unknown> = {
    build: "824",
    demo_base: DEMO_BASE,
    receipt_id: RECEIPT_ID,
    probed_at: new Date().toISOString(),
  };

  const publicRes = await fetch(
    `${DEMO_BASE}/api/receipts/${encodeURIComponent(RECEIPT_ID)}/public`,
    { headers: { Accept: "application/json" }, cache: "no-store" },
  );
  report.public_http_status = publicRes.status;

  const portableRes = await fetch(
    `${DEMO_BASE}/api/receipts/${encodeURIComponent(RECEIPT_ID)}/portable-verification`,
    { headers: { Accept: "application/json" }, cache: "no-store" },
  );
  report.portable_http_status = portableRes.status;

  if (!portableRes.ok) {
    report.portable_body = portableRes.headers.get("content-type")?.includes("json")
      ? await portableRes.json()
      : (await portableRes.text()).slice(0, 300);
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  const body = (await portableRes.json()) as { ok?: boolean; bundle?: PortableVerificationBundle };
  report.export_provenance = body.bundle?.export_provenance;
  report.status_evidence_source = body.bundle?.export_provenance?.status_evidence_source;

  if (!body.ok || !body.bundle) {
    report.error = "portable_bundle_missing";
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  const pinRaw = process.env.ABRAXAS_BUILD824_INTEGRATOR_PINNED_ANCHOR_JSON?.trim();
  if (!pinRaw) {
    report.standalone_verifier = {
      skipped: true,
      reason: "set ABRAXAS_BUILD824_INTEGRATOR_PINNED_ANCHOR_JSON to bundled_trust_anchor from a prior out-of-band pin step",
    };
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  const integratorPinnedTrustAnchor = JSON.parse(pinRaw) as PortableVerificationBundle["bundled_trust_anchor"];
  const verified = verifyPortableBundle({
    bundle: body.bundle,
    integratorPinnedTrustAnchor,
    partnerId: BUILD823_DEMO_PARTNER_ID,
    policyId: BUILD823_DEMO_POLICY_ID,
    now: new Date(),
  });

  report.standalone_verifier = {
    cryptographically_authentic: verified.cryptographically_authentic,
    status_evidence_authentic: verified.status_evidence_authentic,
    currently_acceptable: verified.currently_acceptable,
    failure_codes: verified.failure_codes,
  };

  console.log(JSON.stringify(report, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
