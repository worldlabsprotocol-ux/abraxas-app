import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetFakeWalletStandardBackend, setFakeWalletSchemaMissing } from "@/lib/partner/walletStandard/fakeDurableBackend";
import { resetSandboxPartnerMemory, setLaunchpadAdminMissing, setLaunchpadSchemaMissing } from "./memoryAdmin";

vi.mock("@/lib/supabase/admin", async () => {
  const memory = await import("./memoryAdmin");
  return {
    requireSupabaseAdmin: () => memory.requireSandboxPartnerTestAdmin(),
    getSupabaseAdmin: () => memory.createSandboxPartnerMemoryAdmin(),
  };
});

import { provisionLaunchpadSandbox } from "@/lib/partner/launchpad/provisionSandbox";
import { getLaunchpadApplicationForPartner } from "@/lib/partner/launchpad/resolveLaunchpadApplication";
import { isLaunchpadReturnUrlAllowlisted } from "@/lib/partner/launchpad/launchpadReturnUrlAllowlist";
import { parsePartnerCallbackParams } from "@/lib/partner/integrationKit/callback";
import { AbraxasPartnerKit, permitProtocolAction, verifyWebhookThenReceipt } from "@/lib/partner/integrationKit";
import { signWebhookBody } from "@/lib/partner/webhooks/webhookSigning";
import { AbraxasTradingVenueAdapter } from "@/lib/partner/tradingVenue";
import { AbraxasPaymentAuthorizationAdapter } from "@/lib/partner/paymentAuthorization";
import {
  WALLET_STANDARD_NO_WALLET_PRODUCT,
  WALLET_STANDARD_NOT_IDENTITY,
} from "@/lib/partner/walletStandard/contract";
import { buildSandboxTestConsoleView } from "@/lib/partner/launchpad/sandboxTestConsole/view";
import {
  buildGoLiveReadinessView,
  clientOverrideRejected,
  submitGoLiveReviewRequest,
  validateGoLiveNote,
  type GoLiveEvidence,
} from "@/lib/partner/launchpad/goLiveReadiness";
import { resolvePolicyPack } from "@/lib/partner/launchpad/policyPacks";
import { buildLaunchpadPolicyId } from "@/lib/partner/launchpad/policyCatalog";
import type { PartnerFlowPublicReceipt } from "@/lib/partner/verifyPartnerFlowReceipt";
import {
  SANDBOX_PARTNER_CONTRACT_COMMAND,
  SANDBOX_PARTNER_CONTRACT_NOTICE,
  SANDBOX_PARTNER_CONTRACT_STAGES,
} from "./contract";

const PARTNER = "acme-sandbox";
const PACK = "age_21_retail";
const CALLBACK = "http://localhost:3000/abraxas/callback";
const HTTPS_CALLBACK = "https://partner.example/callback";

const LEAK = /abx_live_|eyJ[A-Za-z0-9_-]{10,}|relation .* does not exist|wallet_address|date_of_birth|legal_name/i;

function leakScan(value: unknown): string[] {
  const blob = JSON.stringify(value);
  const hits: string[] = [];
  if (LEAK.test(blob)) hits.push("sensitive");
  if (/abx_test_[A-Za-z0-9_-]{12,}/.test(blob) && !blob.includes("key_prefix")) hits.push("sandbox_key");
  return hits;
}

function receiptFor(app: { partner_id: string; policy_id: string }, kind: "approved" | "denied" | "expired" | "revoked" | "cross" | "policy" | "version" = "approved"): PartnerFlowPublicReceipt {
  const base: PartnerFlowPublicReceipt & { policy_version?: number } = {
    receipt_id: `dr_local_${kind}`,
    schema_version: "1.0.0",
    partner_id: kind === "cross" ? "other-partner" : app.partner_id,
    policy_id: kind === "policy" ? "other-age_21_retail-v1" : app.policy_id,
    policy_version: kind === "version" ? 99 : 1,
    decision_result: kind === "denied" ? "denied" : "approved",
    signature_valid: true,
    expires_at: kind === "expired" ? "2020-01-01T00:00:00.000Z" : "2099-01-01T00:00:00.000Z",
    status: kind === "revoked" ? "revoked" : kind === "expired" ? "expired" : "active",
    production_usable: false,
    decision_context: "sandbox_only",
    currently_valid: kind === "approved" || kind === "cross" || kind === "policy" || kind === "version",
    invalidation_reasons: [],
    artifact_type: "eligibility_decision_receipt",
  };
  if (kind === "expired" || kind === "revoked" || kind === "denied") base.currently_valid = false;
  return base;
}

async function provisionOne() {
  const created = await provisionLaunchpadSandbox({
    applicationName: "Acme Sandbox",
    displayName: "Acme",
    partnerId: PARTNER,
    policyTemplateId: PACK,
    returnUrl: CALLBACK,
    idempotencyKey: "sandbox-partner-contract-1",
  });
  if (!created.ok) throw new Error(created.code);
  return created;
}

function kitFor(result: Awaited<ReturnType<typeof provisionOne>>["result"], receipts: Map<string, PartnerFlowPublicReceipt>) {
  return new AbraxasPartnerKit({
    partnerId: result.partner_id,
    policyId: result.policy_id,
    policyVersion: result.policy_version,
    environment: "sandbox",
    appSlug: result.public_slug,
    policyPackId: PACK,
    fetchFn: (async (url: string) => {
      const id = decodeURIComponent(String(url).split("/").slice(-2, -1)[0] ?? "");
      const found = receipts.get(id);
      if (!found) return new Response(JSON.stringify({ error: "missing" }), { status: 404 });
      return new Response(JSON.stringify(found), { status: 200, headers: { "content-type": "application/json" } });
    }) as typeof fetch,
  });
}

function goLiveEvidence(result: Awaited<ReturnType<typeof provisionOne>>["result"], overrides: Partial<GoLiveEvidence> = {}): GoLiveEvidence {
  return {
    applicationId: result.application_id,
    partnerId: result.partner_id,
    status: "active",
    environment: "sandbox",
    policyId: result.policy_id,
    policyVersion: result.policy_version,
    policyTemplateId: PACK,
    allowedReturnUrls: [HTTPS_CALLBACK],
    activeSandboxKey: true,
    webhookConfigured: true,
    webhookEnabled: true,
    latestDeliveryStatus: null,
    verifiedHostnames: ["partner.example"],
    starterKitEvidenced: true,
    starterKitRuntime: "nextjs",
    request: null,
    ...overrides,
  };
}

describe("end-to-end sandbox partner contract", () => {
  beforeEach(() => {
    resetSandboxPartnerMemory();
    resetFakeWalletStandardBackend();
  });

  it("stage:discover resolves the catalog pack used by Launchpad and Studio", () => {
    const pack = resolvePolicyPack(PACK);
    expect(pack?.id).toBe(PACK);
    expect(pack?.production_suitability).toBe("production_eligible_after_safety_gate");
    expect(SANDBOX_PARTNER_CONTRACT_STAGES[0]).toBe("discover");
    expect(SANDBOX_PARTNER_CONTRACT_COMMAND).toContain("sandboxPartnerContract.test.ts");
    expect(SANDBOX_PARTNER_CONTRACT_NOTICE).toContain("does not issue a real receipt");
  });

  it("stage:create_sandbox_app provisions exactly one app and an abx_test key through the existing path", async () => {
    const created = await provisionOne();
    expect(created.result.partner_id).toBe(PARTNER);
    expect(created.result.policy_id).toBe(buildLaunchpadPolicyId(PARTNER, PACK));
    expect(created.result.policy_version).toBe(1);
    expect(created.apiKey?.startsWith("abx_test_")).toBe(true);
    expect(created.result.api_key.startsWith("abx_test_")).toBe(true);
    const replay = await provisionLaunchpadSandbox({
      applicationName: "Acme Sandbox",
      displayName: "Acme",
      partnerId: PARTNER,
      policyTemplateId: PACK,
      returnUrl: CALLBACK,
      idempotencyKey: "sandbox-partner-contract-1",
    });
    expect(replay.ok).toBe(true);
    if (replay.ok) {
      expect(replay.idempotencyReplay).toBe(true);
      expect(replay.apiKey).toBeUndefined();
      expect(replay.result.application_id).toBe(created.result.application_id);
    }
  });

  it("deny:cross_tenant_application_access rejects another partner_id on the same application_id", async () => {
    const created = await provisionOne();
    const own = await getLaunchpadApplicationForPartner(created.result.application_id, PARTNER);
    const other = await getLaunchpadApplicationForPartner(created.result.application_id, "other-tenant");
    expect(own?.id).toBe(created.result.application_id);
    expect(other).toBeNull();
  });

  it("stage:configure_callback binds the server-derived allowlist and rejects an altered callback", async () => {
    const created = await provisionOne();
    const app = await getLaunchpadApplicationForPartner(created.result.application_id, PARTNER);
    expect(isLaunchpadReturnUrlAllowlisted(app!.allowed_return_urls, CALLBACK)).toBe(true);
    expect(isLaunchpadReturnUrlAllowlisted(app!.allowed_return_urls, "https://evil.example/callback")).toBe(false);
  });

  it("stage:hosted_partner_flow keeps callback query params untrusted", async () => {
    const created = await provisionOne();
    const parsed = parsePartnerCallbackParams({ receipt_id: "dr_local_approved", decision: "approved" });
    expect(parsed.ok).toBe(true);
    const kit = kitFor(created.result, new Map());
    expect(kit.createHostedVerificationUrl(CALLBACK)).toContain("/partner/verify");
    expect(kit.createHostedVerificationUrl(CALLBACK)).toContain(created.result.public_slug);
    const trusted = kit.evaluateFetchedReceipt(receiptFor(created.result));
    expect(trusted.callback_trusted).toBe(false);
  });

  it("deny:browser_only_static_implementation_request fails closed without a fetched receipt", async () => {
    const created = await provisionOne();
    const kit = kitFor(created.result, new Map());
    const result = await kit.verifyCallback({ receipt_id: "dr_missing", decision: "approved" });
    expect(permitProtocolAction(result)).toBe(false);
    expect(result.outcome).not.toBe("permitted");
    expect(result.callback_trusted).toBe(false);
    expect(leakScan(result)).toEqual([]);
  });

  it("stage:policy_result and stage:signed_receipt produce the minimal approved sandbox receipt shape", async () => {
    const created = await provisionOne();
    const approved = receiptFor(created.result);
    expect(approved.decision_result).toBe("approved");
    expect(approved.production_usable).toBe(false);
    expect(approved.decision_context).toBe("sandbox_only");
    expect(approved.artifact_type).toBe("eligibility_decision_receipt");
    expect(approved.currently_valid).toBe(true);
    const kit = kitFor(created.result, new Map([[approved.receipt_id!, approved]]));
    const evaluated = kit.evaluateFetchedReceipt(approved);
    expect(permitProtocolAction(evaluated)).toBe(true);
    expect(evaluated.production_usable).toBe(false);
  });

  it("stage:server_receipt_verification re-fetches currently_valid and denies expired, revoked, or denied receipts", async () => {
    const created = await provisionOne();
    const store = new Map<string, PartnerFlowPublicReceipt>();
    for (const kind of ["approved", "denied", "expired", "revoked"] as const) {
      const item = receiptFor(created.result, kind);
      store.set(item.receipt_id!, item);
    }
    const kit = kitFor(created.result, store);
    expect(permitProtocolAction(await kit.verifyReceiptId("dr_local_approved"))).toBe(true);
    expect(permitProtocolAction(await kit.verifyReceiptId("dr_local_denied"))).toBe(false);
    expect(permitProtocolAction(await kit.verifyReceiptId("dr_local_expired"))).toBe(false);
    expect(permitProtocolAction(await kit.verifyReceiptId("dr_local_revoked"))).toBe(false);
  });

  it("deny:altered_partner_policy_or_version fails closed", async () => {
    const created = await provisionOne();
    const kit = kitFor(created.result, new Map());
    expect(permitProtocolAction(kit.evaluateFetchedReceipt(receiptFor(created.result, "cross")))).toBe(false);
    expect(permitProtocolAction(kit.evaluateFetchedReceipt(receiptFor(created.result, "policy")))).toBe(false);
    expect(permitProtocolAction(kit.evaluateFetchedReceipt(receiptFor(created.result, "version")))).toBe(false);
  });

  it("stage:webhook_recheck requires signature validation and receipt re-fetch; the body is never a grant", async () => {
    const created = await provisionOne();
    const approved = receiptFor(created.result);
    const kit = kitFor(created.result, new Map([[approved.receipt_id!, approved]]));
    const payload = {
      event_id: "evt_1",
      event_type: "partner.receipt.issued",
      occurred_at: "2026-01-01T00:00:00.000Z",
      partner_id: PARTNER,
      receipt_id: approved.receipt_id,
    };
    const rawBody = JSON.stringify(payload);
    const timestamp = String(Math.floor(Date.now() / 1000));
    const secret = "whsec_local_fixture";
    const seen = new Set<string>();
    const unsigned = await verifyWebhookThenReceipt({
      kit,
      secret,
      timestamp,
      rawBody,
      signatureHeader: "v1=deadbeef",
      seenEventIds: seen,
    });
    expect(unsigned.grant).toBe(false);
    expect(unsigned.webhook.ok).toBe(false);

    const signature = signWebhookBody({ secret, timestamp, rawBody });
    const first = await verifyWebhookThenReceipt({
      kit,
      secret,
      timestamp,
      rawBody,
      signatureHeader: signature,
      seenEventIds: seen,
    });
    expect(first.webhook.ok).toBe(true);
    expect(first.webhook.authorization).toBe(false);
    expect(first.grant).toBe(true);

    const replay = await verifyWebhookThenReceipt({
      kit,
      secret,
      timestamp,
      rawBody,
      signatureHeader: signature,
      seenEventIds: seen,
    });
    expect(replay.grant).toBe(false);
    expect(replay.webhook.ok).toBe(true);
    if (replay.webhook.ok) expect(replay.webhook.duplicate).toBe(true);
    expect(leakScan(first)).toEqual([]);
  });

  it("stage:trading_preflight and stage:payment_preflight allow only the exact partner, policy, action, scope, receipt, and nonce", async () => {
    const created = await provisionOne();
    const approved = receiptFor(created.result);
    const venue = new AbraxasTradingVenueAdapter({
      partnerId: created.result.partner_id,
      policyId: created.result.policy_id,
      policyVersion: created.result.policy_version,
      environment: "sandbox",
    });
    const payment = new AbraxasPaymentAuthorizationAdapter({
      partnerId: created.result.partner_id,
      policyId: created.result.policy_id,
      policyVersion: created.result.policy_version,
      environment: "sandbox",
    });
    const venueContract = venue.issueActionContract({
      action_type: "enable_market_access",
      action_scope: "sandbox:market_access",
    });
    const payContract = payment.issueActionContract({
      action_type: "authorize_checkout",
      action_scope: "sandbox:checkout",
    });
    if ("ok" in venueContract || "ok" in payContract) throw new Error("expected contracts");
    const allowedVenue = await venue.preflight({
      result: venue.evaluateFetchedReceipt(approved),
      contract: venueContract,
    });
    const allowedPay = await payment.preflight({
      result: payment.evaluateFetchedReceipt(approved),
      contract: payContract,
    });
    expect(allowedVenue.allowed).toBe(true);
    expect(allowedPay.allowed).toBe(true);

    const replayedVenue = await venue.preflight({
      result: venue.evaluateFetchedReceipt(approved),
      contract: venueContract,
    });
    expect(replayedVenue.allowed).toBe(false);
    expect(replayedVenue.reason).toBe("replayed");

    const altered = await venue.preflight({
      result: venue.evaluateFetchedReceipt(approved),
      contract: { ...venueContract, action_scope: "sandbox:market_access", action_type: "enable_market_access", partner_id: "other" },
      action_type: "enable_market_access",
      action_scope: "sandbox:market_access",
    });
    expect(altered.allowed).toBe(false);
  });

  it("deny:altered_action_scope_or_expiry is typed and leak-free", async () => {
    const created = await provisionOne();
    const venue = new AbraxasTradingVenueAdapter({
      partnerId: created.result.partner_id,
      policyId: created.result.policy_id,
      policyVersion: 1,
      environment: "sandbox",
    });
    const contract = venue.issueActionContract({
      action_type: "enable_market_access",
      action_scope: "sandbox:market_access",
    });
    if ("ok" in contract) throw new Error("expected contract");
    const mismatch = await venue.preflight({
      result: venue.evaluateFetchedReceipt(receiptFor(created.result)),
      contract,
      action_type: "enable_market_access",
      action_scope: "other:scope",
    });
    const expired = await venue.preflight({
      result: venue.evaluateFetchedReceipt(receiptFor(created.result)),
      contract: { ...contract, expires_at: "2020-01-01T00:00:00.000Z" },
    });
    expect(mismatch.allowed).toBe(false);
    expect(expired.allowed).toBe(false);
    expect(leakScan({ mismatch, expired })).toEqual([]);
  });

  it("stage:wallet_standard_optional stays message-only and unused by default", async () => {
    const created = await provisionOne();
    const venue = new AbraxasTradingVenueAdapter({
      partnerId: created.result.partner_id,
      policyId: created.result.policy_id,
      policyVersion: 1,
      environment: "sandbox",
    });
    const contract = venue.issueActionContract();
    if ("ok" in contract) throw new Error("expected contract");
    expect(contract.wallet_binding).toBe("not_attached");
    const bound = await venue.preflight({
      result: venue.evaluateFetchedReceipt(receiptFor(created.result)),
      contract,
    });
    expect(bound.action_binding.wallet_binding).toBe("not_attached");
    expect(WALLET_STANDARD_NOT_IDENTITY.toLowerCase()).toContain("not identity");
    expect(WALLET_STANDARD_NO_WALLET_PRODUCT.toLowerCase()).toContain("never generates a transaction");
  });

  it("stage:sandbox_test_console and stage:production_review_request are server-derived and review-only", async () => {
    const created = await provisionOne();
    const consoleView = buildSandboxTestConsoleView({
      application_id: created.result.application_id,
      status: "active",
      environment: "sandbox",
      policy_version: created.result.policy_version,
      policy_template_id: PACK,
      allowed_return_urls: [CALLBACK],
      has_sandbox_key: true,
      webhook_configured: true,
    }, ["webhooks"]);
    expect(consoleView.issues_production_key).toBe(false);
    expect(consoleView.grants_production).toBe(false);
    expect(consoleView.checks.find((check) => check.id === "sandbox_app")?.status).toBe("pass");

    const view = buildGoLiveReadinessView(goLiveEvidence(created.result));
    expect(view.can_request_review).toBe(true);
    expect(view.issues_production_key).toBe(false);
    const first = await submitGoLiveReviewRequest({
      evidence: goLiveEvidence(created.result),
      view,
      note: "Please review",
    });
    expect(first.ok).toBe(true);
    if (!first.ok) throw new Error("expected request");
    const replay = await submitGoLiveReviewRequest({
      evidence: goLiveEvidence(created.result, { request: first.request }),
      view: buildGoLiveReadinessView(goLiveEvidence(created.result, { request: first.request })),
      note: "Please review",
    });
    expect(replay.ok).toBe(true);
    if (replay.ok) {
      expect(replay.replay).toBe(true);
      expect(replay.request.id).toBe(first.request.id);
      expect(replay.request.status).toBe("pending");
    }
  });

  it("deny:client_override_of_readiness_approval_or_production_fields is rejected", () => {
    expect(clientOverrideRejected({ partner_id: "other", status: "approved", activate_production: true, api_key: "x" })).toBe(true);
    expect(validateGoLiveNote("abx_live_shouldfail").ok).toBe(false);
    expect(validateGoLiveNote("https://partner.example/callback").ok).toBe(false);
  });

  it("deny:missing_durable_schema_or_admin_store returns typed safe failures", async () => {
    setLaunchpadAdminMissing(true);
    await expect(provisionLaunchpadSandbox({
      applicationName: "Acme Sandbox",
      displayName: "Acme",
      partnerId: PARTNER,
      policyTemplateId: PACK,
      returnUrl: CALLBACK,
    })).rejects.toMatchObject({ code: "supabase_admin_not_configured" });
    setLaunchpadAdminMissing(false);
    setLaunchpadSchemaMissing(true);
    const failed = await provisionLaunchpadSandbox({
      applicationName: "Acme Sandbox",
      displayName: "Acme",
      partnerId: PARTNER,
      policyTemplateId: PACK,
      returnUrl: CALLBACK,
    });
    expect(failed.ok).toBe(false);
    if (!failed.ok) expect(failed.code).toBe("provision_failed");
    expect(JSON.stringify(failed)).not.toMatch(/relation|SQLSTATE|schema cache/i);
    setLaunchpadSchemaMissing(false);
    setFakeWalletSchemaMissing(true);
    const created = await provisionOne();
    const venue = new AbraxasTradingVenueAdapter({
      partnerId: created.result.partner_id,
      policyId: created.result.policy_id,
      policyVersion: 1,
      environment: "sandbox",
    });
    const contract = venue.issueActionContract();
    if ("ok" in contract) throw new Error("expected contract");
    const denied = await venue.preflight({
      result: venue.evaluateFetchedReceipt(receiptFor(created.result)),
      contract,
    });
    expect(denied.allowed).toBe(false);
    expect(denied.reason).toBe("store_unavailable");
    expect(leakScan(denied)).toEqual([]);
  });
});
