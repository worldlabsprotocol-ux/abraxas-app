#!/usr/bin/env npx tsx
/**
 * Standalone relying-party verify — @abraxas/independent-verifier only (no Abraxas app imports).
 *
 * Usage:
 *   RP_TRUST_ANCHOR_PATH=./trust-config.demo.json \
 *   RP_ABRAXAS_BASE_URL=https://demo.abraxasworld.xyz \
 *   npx tsx examples/portable-relying-party/verifyPortableReceipt.ts dr_jSXuDfM_pFMT36du
 */
import { readFile } from "node:fs/promises";
import {
  validateTrustAnchorBundle,
  verifyAbraxasReceiptIndependently,
  type TrustAnchorBundleV1,
} from "../../packages/abraxas-independent-verifier/src/index";
import { assertBundledAnchorMatchesPin } from "./pinTrustAnchor";
import { enforcementFromVerification } from "./enforceDecision";

type PortableBundle = {
  decision_receipt: Parameters<typeof verifyAbraxasReceiptIndependently>[0]["record"];
  bundled_trust_anchor: TrustAnchorBundleV1;
  signed_issuer_authority: Parameters<typeof verifyAbraxasReceiptIndependently>[0]["signedIssuerAuthority"];
  signed_status_statement: NonNullable<
    Parameters<typeof verifyAbraxasReceiptIndependently>[0]["signedStatusStatement"]
  >;
  registry_version: number;
};

async function loadPin(): Promise<TrustAnchorBundleV1> {
  const path = process.env.RP_TRUST_ANCHOR_PATH?.trim() ?? "examples/portable-relying-party/trust-config.demo.template.json";
  const raw = await readFile(path, "utf8");
  const parsed = JSON.parse(raw) as TrustAnchorBundleV1;
  const validated = validateTrustAnchorBundle(parsed);
  if (!validated.ok) throw new Error(`invalid_trust_anchor:${validated.reason}`);
  return parsed;
}

async function fetchBundle(baseUrl: string, receiptId: string): Promise<PortableBundle> {
  const res = await fetch(
    `${baseUrl.replace(/\/$/, "")}/api/receipts/${encodeURIComponent(receiptId)}/portable-verification`,
    { headers: { Accept: "application/json" }, cache: "no-store" },
  );
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`portable_fetch_failed:${res.status}:${body.slice(0, 200)}`);
  }
  const json = (await res.json()) as { ok?: boolean; bundle?: PortableBundle };
  if (!json.ok || !json.bundle) throw new Error("portable_bundle_missing");
  return json.bundle;
}

async function main() {
  const receiptId = process.argv[2]?.trim();
  if (!receiptId) {
    console.error("Usage: verifyPortableReceipt.ts <receipt_id>");
    process.exit(1);
  }

  const partnerId = process.env.RP_PARTNER_ID?.trim();
  const policyId = process.env.RP_POLICY_ID?.trim();
  if (!partnerId || !policyId) {
    console.error("Set RP_PARTNER_ID and RP_POLICY_ID to your relying-party scope.");
    process.exit(1);
  }

  const baseUrl = process.env.RP_ABRAXAS_BASE_URL?.trim() ?? "https://demo.abraxasworld.xyz";
  const environment = (process.env.RP_ENVIRONMENT?.trim() === "production" ? "production" : "demo") as
    | "demo"
    | "production";

  const pin = await loadPin();
  const bundle = await fetchBundle(baseUrl, receiptId);

  const pinMatch = assertBundledAnchorMatchesPin({
    bundled: bundle.bundled_trust_anchor,
    integratorPinned: pin,
  });
  if (!pinMatch.ok) {
    console.log(JSON.stringify({ action: "indeterminate", failure_codes: [pinMatch.reason] }, null, 2));
    process.exit(2);
  }

  const verified = verifyAbraxasReceiptIndependently({
    record: bundle.decision_receipt,
    pinnedTrustAnchor: pin,
    signedIssuerAuthority: bundle.signed_issuer_authority,
    signedStatusStatement: bundle.signed_status_statement,
    relyingParty: { partner_id: partnerId, policy_id: policyId, environment },
    minimumRegistryVersion: bundle.registry_version > 1 ? bundle.registry_version - 1 : undefined,
    statementObservedAt: new Date().toISOString(),
  });

  const enforcement = enforcementFromVerification(verified);
  console.log(
    JSON.stringify(
      {
        receipt_id: receiptId,
        abraxas_base: baseUrl,
        enforcement,
        cryptographically_authentic: verified.cryptographically_authentic,
        status_evidence_authentic: verified.status_evidence_authentic,
        currently_acceptable: verified.currently_acceptable,
        verified_offline_after_fetch: true,
      },
      null,
      2,
    ),
  );
  process.exit(enforcement.action === "permit" ? 0 : enforcement.action === "deny" ? 3 : 2);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
