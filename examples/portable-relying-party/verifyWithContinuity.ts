#!/usr/bin/env npx tsx
/**
 * Build #827 — seven-step portable verify with durable checkpoints (verifier-only runtime).
 *
 * 1. Establish trusted issuer authority (pin JSON)
 * 2. Treat receipt id as authorized callback handle (never trust URL boolean alone)
 * 3. Fetch portable evidence once
 * 4. Independently verify with checkpoint floors
 * 5. Commit authenticated minimum status/registry versions
 * 6. Enforce permit | deny | indeterminate
 * 7. Emit safe next actions on failure
 */
import { readFile } from "node:fs/promises";
import {
  validateTrustAnchorBundle,
  verifyAbraxasReceiptIndependently,
  type TrustAnchorBundleV1,
} from "../../packages/abraxas-independent-verifier/src/index";
import { assertBundledAnchorMatchesPin } from "./pinTrustAnchor";
import { enforcementFromVerification } from "./enforceDecision";
import {
  commitPartnerCheckpointMonotonic,
  readPartnerCheckpoint,
  type PartnerCheckpointScope,
} from "./partnerCheckpointFile";

type PortableBundle = {
  decision_receipt: Parameters<typeof verifyAbraxasReceiptIndependently>[0]["record"];
  bundled_trust_anchor: TrustAnchorBundleV1;
  signed_issuer_authority: Parameters<typeof verifyAbraxasReceiptIndependently>[0]["signedIssuerAuthority"];
  signed_status_statement: NonNullable<
    Parameters<typeof verifyAbraxasReceiptIndependently>[0]["signedStatusStatement"]
  >;
  registry_version: number;
};

const SAFE_NEXT: Record<string, string> = {
  status_version_rollback_rejected: "Fetch fresh portable bundle; stale signed status rejected.",
  registry_version_rollback_rejected: "Fetch fresh issuer authority snapshot.",
  corrupted_checkpoint_state: "Restore checkpoint backup; do not silently reset floors to zero.",
  bundled_trust_anchor_not_authenticated: "Bundled anchor must match out-of-band pin.",
  portable_verification_fetch_failed: "Retry export with bounded backoff.",
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

function nextActions(codes: string[]): string[] {
  const out: string[] = [];
  for (const c of codes) {
    const line = SAFE_NEXT[c];
    if (line && !out.includes(line)) out.push(line);
  }
  return out;
}

async function main() {
  const receiptId = process.argv[2]?.trim();
  if (!receiptId) {
    console.error("Usage: verifyWithContinuity.ts <receipt_id>");
    process.exit(1);
  }

  const partnerId = process.env.RP_PARTNER_ID?.trim();
  const policyId = process.env.RP_POLICY_ID?.trim();
  if (!partnerId || !policyId) {
    console.error("Set RP_PARTNER_ID and RP_POLICY_ID.");
    process.exit(1);
  }

  const baseUrl = process.env.RP_ABRAXAS_BASE_URL?.trim() ?? "https://demo.abraxasworld.xyz";
  const environment = (process.env.RP_ENVIRONMENT?.trim() === "production" ? "production" : "demo") as
    | "demo"
    | "production";
  const checkpointPath =
    process.env.RP_CHECKPOINT_PATH?.trim() ?? "examples/portable-relying-party/checkpoints.demo.json";

  const pin = await loadPin();
  const scope: PartnerCheckpointScope = { environment, partner_id: partnerId, receipt_id: receiptId };

  const prior = await readPartnerCheckpoint(checkpointPath, scope);

  let bundle: PortableBundle;
  try {
    bundle = await fetchBundle(baseUrl, receiptId);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.log(
      JSON.stringify(
        {
          action: "indeterminate",
          failure_codes: ["portable_verification_fetch_failed"],
          next_actions: nextActions(["portable_verification_fetch_failed"]),
          detail: msg,
        },
        null,
        2,
      ),
    );
    process.exit(2);
  }

  const pinMatch = assertBundledAnchorMatchesPin({
    bundled: bundle.bundled_trust_anchor,
    integratorPinned: pin,
  });
  if (!pinMatch.ok) {
    console.log(
      JSON.stringify(
        {
          action: "indeterminate",
          failure_codes: [pinMatch.reason],
          next_actions: nextActions([pinMatch.reason]),
        },
        null,
        2,
      ),
    );
    process.exit(2);
  }

  const nowIso = new Date().toISOString();
  const verified = verifyAbraxasReceiptIndependently({
    record: bundle.decision_receipt,
    pinnedTrustAnchor: pin,
    signedIssuerAuthority: bundle.signed_issuer_authority,
    signedStatusStatement: bundle.signed_status_statement,
    relyingParty: { partner_id: partnerId, policy_id: policyId, environment },
    minimumStatusVersion: prior?.minimum_status_version,
    minimumRegistryVersion: prior?.minimum_registry_version,
    statementObservedAt: nowIso,
  });

  let checkpointResult:
    | { ok: true; minimum_status_version: number; minimum_registry_version: number }
    | { ok: false; reason: string }
    | { ok: "skipped"; reason: string } = { ok: "skipped", reason: "status_not_authentic" };

  if (verified.status_evidence_authentic) {
    const commit = await commitPartnerCheckpointMonotonic(checkpointPath, scope, {
      observed_status_version: bundle.signed_status_statement.payload.status_version,
      observed_registry_version: bundle.signed_issuer_authority.payload.registry_version,
      authenticated_at: nowIso,
    });
    if (!commit.ok) {
      checkpointResult = { ok: false, reason: commit.reason };
    } else {
      checkpointResult = {
        ok: true,
        minimum_status_version: commit.checkpoint.minimum_status_version,
        minimum_registry_version: commit.checkpoint.minimum_registry_version,
      };
    }
  }

  const failure_codes = [
    ...new Set([
      ...verified.failure_codes,
      ...(checkpointResult.ok === false ? [checkpointResult.reason] : []),
    ]),
  ];
  const enforcement =
    checkpointResult.ok === false && verified.status_evidence_authentic
      ? { action: "indeterminate" as const, failure_codes }
      : enforcementFromVerification(verified);
  console.log(
    JSON.stringify(
      {
        receipt_id: receiptId,
        workflow: "portable_relying_party_trust_continuity_v1",
        enforcement,
        checkpoint: checkpointResult,
        next_actions: nextActions(failure_codes),
        cryptographically_authentic: verified.cryptographically_authentic,
        status_evidence_authentic: verified.status_evidence_authentic,
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
