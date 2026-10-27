#!/usr/bin/env npx tsx
/**
 * External relying party — verify a persisted portable bundle (no Abraxas app imports, no network).
 *
 * Usage:
 *   RP_PARTNER_ID=... RP_POLICY_ID=... RP_TRUST_ANCHOR_PATH=... \
 *   npx tsx examples/portable-relying-party/verifyPortableReceiptFromFile.ts ./bundle.json
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
  const path =
    process.env.RP_TRUST_ANCHOR_PATH?.trim()
    ?? "examples/portable-relying-party/trust-config.demo.template.json";
  const raw = await readFile(path, "utf8");
  const parsed = JSON.parse(raw) as TrustAnchorBundleV1;
  const validated = validateTrustAnchorBundle(parsed);
  if (!validated.ok) throw new Error(`invalid_trust_anchor:${validated.reason}`);
  return parsed;
}

async function loadBundle(path: string): Promise<PortableBundle> {
  const raw = await readFile(path, "utf8");
  const json = JSON.parse(raw) as PortableBundle | { bundle?: PortableBundle };
  if ("bundle" in json && json.bundle) return json.bundle;
  return json as PortableBundle;
}

async function main() {
  const bundlePath = process.argv[2]?.trim() ?? process.env.RP_BUNDLE_PATH?.trim();
  if (!bundlePath) {
    console.error("Usage: verifyPortableReceiptFromFile.ts <bundle.json>");
    process.exit(1);
  }

  const partnerId = process.env.RP_PARTNER_ID?.trim();
  const policyId = process.env.RP_POLICY_ID?.trim();
  if (!partnerId || !policyId) {
    console.error("Set RP_PARTNER_ID and RP_POLICY_ID to your relying-party scope.");
    process.exit(1);
  }

  const environment = (process.env.RP_ENVIRONMENT?.trim() === "production" ? "production" : "demo") as
    | "demo"
    | "production";

  const pin = await loadPin();
  const bundle = await loadBundle(bundlePath);

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
  const receiptId = bundle.decision_receipt.receipt_id ?? null;
  console.log(
    JSON.stringify(
      {
        receipt_id: receiptId,
        bundle_path: bundlePath,
        enforcement,
        cryptographically_authentic: verified.cryptographically_authentic,
        issuer_currently_authorized: verified.issuer_currently_authorized,
        policy_and_audience_match: verified.policy_and_audience_match,
        status_evidence_authentic: verified.status_evidence_authentic,
        currently_acceptable: verified.currently_acceptable,
        failure_codes: verified.failure_codes,
        verified_offline_from_file: true,
        network_required: false,
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
