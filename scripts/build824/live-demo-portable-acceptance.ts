#!/usr/bin/env npx tsx
/**
 * Build #824 — live Demo portable export + standalone verifier (read-only).
 */

import { verifyPortableBundle } from "../../lib/partner/portableIndependentVerification/verifyWithStandaloneVerifier";
import type { PortableVerificationBundle } from "../../lib/partner/portableIndependentVerification/buildPortableVerificationBundle";
import { BUILD823_DEMO_RECEIPT_ID } from "../../lib/partner/portableIndependentVerification/fixtures/build823DemoReceipt.fixture";
import { resolveBuild824TrustedAudience } from "./resolveBuild824TrustedAudience";

const DEMO_BASE = process.env.ABRAXAS_BUILD824_DEMO_BASE_URL?.trim() ?? "https://demo.abraxasworld.xyz";
const RECEIPT_ID = process.env.ABRAXAS_BUILD824_RECEIPT_ID?.trim() ?? BUILD823_DEMO_RECEIPT_ID;

function cloneBundleWithTamperedReceiptPartner(
  bundle: PortableVerificationBundle,
  forgedPartnerId: string,
): PortableVerificationBundle {
  return {
    ...bundle,
    decision_receipt: {
      ...bundle.decision_receipt,
      partner_id: forgedPartnerId,
    },
  };
}

async function main() {
  const report: Record<string, unknown> = {
    build: "824",
    demo_base: DEMO_BASE,
    receipt_id: RECEIPT_ID,
    probed_at: new Date().toISOString(),
  };

  const trustedAudience = await resolveBuild824TrustedAudience({
    demoBase: DEMO_BASE,
    receiptId: RECEIPT_ID,
  });
  if ("error" in trustedAudience) {
    report.trusted_audience_error = trustedAudience.error;
    report.hint =
      "Set ABRAXAS_BUILD824_EXPECTED_PARTNER_ID and ABRAXAS_BUILD824_EXPECTED_POLICY_ID from authorized sandbox provisioning (out-of-band), or use the teaching receipt fixture id.";
    console.log(JSON.stringify(report, null, 2));
    process.exit(2);
    return;
  }
  report.trusted_audience_source = trustedAudience.source;
  report.trusted_partner_id = trustedAudience.partner_id;
  report.trusted_policy_id = trustedAudience.policy_id;

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
    partnerId: trustedAudience.partner_id,
    policyId: trustedAudience.policy_id,
    now: new Date(),
  });

  report.standalone_verifier = {
    cryptographically_authentic: verified.cryptographically_authentic,
    issuer_currently_authorized: verified.issuer_currently_authorized,
    status_evidence_authentic: verified.status_evidence_authentic,
    policy_and_audience_match: verified.policy_and_audience_match,
    currently_acceptable: verified.currently_acceptable,
    failure_codes: verified.failure_codes,
    required_abraxas_api_at_verify_time: false,
  };

  const wrongPin = {
    ...integratorPinnedTrustAnchor,
    public_jwk: { ...integratorPinnedTrustAnchor.public_jwk, x: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" },
  };
  const wrongPinResult = verifyPortableBundle({
    bundle: body.bundle,
    integratorPinnedTrustAnchor: wrongPin,
    partnerId: trustedAudience.partner_id,
    policyId: trustedAudience.policy_id,
    now: new Date(),
  });
  report.wrong_integrator_pin = {
    cryptographically_authentic: wrongPinResult.cryptographically_authentic,
    failure_codes: wrongPinResult.failure_codes,
  };

  const wrongPartner = verifyPortableBundle({
    bundle: body.bundle,
    integratorPinnedTrustAnchor,
    partnerId: "wrong-partner-id",
    policyId: trustedAudience.policy_id,
    now: new Date(),
  });
  report.wrong_partner = {
    policy_and_audience_match: wrongPartner.policy_and_audience_match,
    cryptographically_authentic: wrongPartner.cryptographically_authentic,
    failure_codes: wrongPartner.failure_codes,
  };

  const wrongPolicy = verifyPortableBundle({
    bundle: body.bundle,
    integratorPinnedTrustAnchor,
    partnerId: trustedAudience.partner_id,
    policyId: `${trustedAudience.policy_id}-forged-suffix`,
    now: new Date(),
  });
  report.wrong_policy = {
    policy_and_audience_match: wrongPolicy.policy_and_audience_match,
    failure_codes: wrongPolicy.failure_codes,
  };

  const tamperedBundle = cloneBundleWithTamperedReceiptPartner(
    body.bundle,
    "attacker-forged-partner-id",
  );
  const tamperedAudience = verifyPortableBundle({
    bundle: tamperedBundle,
    integratorPinnedTrustAnchor,
    partnerId: trustedAudience.partner_id,
    policyId: trustedAudience.policy_id,
    now: new Date(),
  });
  report.tampered_bundle_receipt_partner = {
    policy_and_audience_match: tamperedAudience.policy_and_audience_match,
    cryptographically_authentic: tamperedAudience.cryptographically_authentic,
    failure_codes: tamperedAudience.failure_codes,
    note: "Trusted audience unchanged; forged receipt partner inside bundle must not satisfy integrator expectation.",
  };

  console.log(JSON.stringify(report, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});