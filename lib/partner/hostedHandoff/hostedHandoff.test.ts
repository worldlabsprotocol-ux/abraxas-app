import { afterEach, describe, expect, it } from "vitest";
import type { LaunchpadApplicationRow } from "@/lib/partner/launchpad/types";
import type { PartnerFlowStoredConfig } from "@/lib/partner/launchpad/partnerFlowRequest/view";
import {
  cancelHostedHandoff,
  completeHostedHandoff,
  consumeHandoffReceiptLookup,
  createHostedHandoff,
  bindHandoffToIssuedReceipt,
  handoffLeaks,
  hostedHandoffHttpExamples,
  loadHandoff,
  parseHandoffCreateBody,
  projectPublic,
  resetHostedHandoffsForTests,
  putHandoffForTests,
  runSandboxHandoffFixture,
} from "./index";

const app: LaunchpadApplicationRow = {
  id: "11111111-1111-1111-1111-111111111111",
  public_slug: "acme-retail",
  partner_id: "acme",
  application_name: "Acme retail",
  display_name: "Acme",
  environment: "sandbox",
  policy_id: "acme-age_21_retail-v1",
  policy_version: 1,
  policy_template_id: "age_21_retail",
  allowed_return_urls: ["http://localhost:3000/callback"],
  api_key_id: "key-1",
  production_api_key_id: null,
  production_key_revealed_at: null,
  status: "active",
  idempotency_key: null,
  created_at: "2026-09-20T00:00:00.000Z",
  updated_at: "2026-09-20T00:00:00.000Z",
};

const stored: PartnerFlowStoredConfig = {
  purpose: "Confirm adult retail eligibility",
  action: "retail_access",
  callback_url: "http://localhost:3000/callback",
  capabilities: [],
  display_label: "Acme",
};

afterEach(() => {
  resetHostedHandoffsForTests();
});

describe("hosted partner flow handoff", () => {
  it("creates an opaque holder URL and isolates tenants", async () => {
    const record = await createHostedHandoff({ application: app, stored, runtime: "universal_https" });
    const view = projectPublic(record);
    expect(view.hosted_url).toMatch(/verify_request=vr_/);
    expect(view.hosted_url).not.toMatch(/partner_id|policy_id|callback|return_url|receipt/);
    expect(handoffLeaks(view)).toEqual([]);
    await expect(cancelHostedHandoff(record, "other-partner", app.id)).rejects.toMatchObject({ code: "tenant_mismatch" });
  });

  it("binds callback, policy, action, and purpose from the server config", async () => {
    const record = await createHostedHandoff({ application: app, stored, runtime: "nextjs" });
    expect(record.policy_id).toBe(app.policy_id);
    expect(record.policy_version).toBe(1);
    expect(record.action).toBe("retail_access");
    expect(record.purpose).toBe(stored.purpose);
    expect(record.callback_ref).toHaveLength(12);
    await expect(createHostedHandoff({
      application: app,
      stored: { ...stored, callback_url: "https://evil.example/cb" },
      runtime: "universal_https",
    })).rejects.toMatchObject({ code: "callback_rejected" });
  });

  it("denies expiry, cancel, and replay", async () => {
    const record = await createHostedHandoff({ application: app, stored, runtime: "express" });
    const cancelled = await cancelHostedHandoff(record, app.partner_id, app.id);
    expect(cancelled.status).toBe("cancelled");
    await expect(completeHostedHandoff({
      record: cancelled,
      partnerId: app.partner_id,
      applicationId: app.id,
      publicReceiptId: "rcpt_1",
    })).rejects.toMatchObject({ code: "not_completable" });

    const live = await createHostedHandoff({ application: app, stored, runtime: "serverless" });
    const completed = await completeHostedHandoff({
      record: live,
      partnerId: app.partner_id,
      applicationId: app.id,
      publicReceiptId: "rcpt_2",
    });
    await expect(completeHostedHandoff({
      record: completed,
      partnerId: app.partner_id,
      applicationId: app.id,
      publicReceiptId: "rcpt_2",
    })).rejects.toMatchObject({ code: "replay_denied" });
    await consumeHandoffReceiptLookup(completed, app.partner_id);
    await expect(consumeHandoffReceiptLookup(completed, app.partner_id)).rejects.toMatchObject({ code: "replay_denied" });
  });

  it("rejects extra and forged client fields", () => {
    expect(parseHandoffCreateBody({ return_url: "https://evil.example" }).ok).toBe(false);
    expect(parseHandoffCreateBody({ partner_id: "x", runtime: "nextjs" }).ok).toBe(false);
    expect(parseHandoffCreateBody({ runtime: "nextjs", extra: true }).ok).toBe(false);
    expect(parseHandoffCreateBody({ runtime: "nextjs" }).ok).toBe(true);
  });

  it("runs the sandbox fixture without activating Production", async () => {
    const result = await runSandboxHandoffFixture({ application: app, stored });
    expect(result.created.status).toBe("created");
    expect(result.completed.status).toBe("completed");
    expect(result.consumed.status).toBe("consumed");
    expect(result.partner_must_call).toBe("AbraxasPartnerKit.verifyReceiptId");
    expect(result.callback_is_grant).toBe(false);
    expect(result.activates_production).toBe(false);
    expect(result.fixture_receipt_id).toBe("rcpt_sandbox_fixture");
    expect(handoffLeaks(result)).toEqual([]);
  });

  it("binds a partner-bound receipt to the matching verify_request only", async () => {
    const record = await createHostedHandoff({ application: app, stored, runtime: "nextjs" });
    await bindHandoffToIssuedReceipt({
      verifyRequest: record.verify_request,
      partnerId: "other",
      policyId: app.policy_id!,
      publicReceiptId: "rcpt_wrong",
    });
    expect((await loadHandoff(record.handoff_ref))?.status).toBe("created");
    await bindHandoffToIssuedReceipt({
      verifyRequest: record.verify_request,
      partnerId: app.partner_id,
      policyId: app.policy_id!,
      publicReceiptId: "rcpt_ok",
    });
    const bound = await loadHandoff(record.handoff_ref);
    expect(bound?.status).toBe("completed");
    expect(bound?.public_receipt_id).toBe("rcpt_ok");
  });

  it("ships Universal, Next, Express, Wix, Serverless, and mobile examples", () => {
    const examples = hostedHandoffHttpExamples();
    expect(Object.keys(examples).sort()).toEqual([
      "express",
      "mobile_https",
      "nextjs",
      "serverless",
      "universal_https",
      "wix_velo",
    ]);
    expect(examples.universal_https).toContain("/api/v1/partner-handoff");
    expect(examples.wix_velo).toContain("wix-secrets-backend");
    expect(examples.mobile_https).toContain("verifyReceiptId");
  });

  it("keeps expired created records from completing", async () => {
    const record = await createHostedHandoff({ application: app, stored, runtime: "mobile_https" });
    const expired = { ...record, expires_at: "2000-01-01T00:00:00.000Z" };
    putHandoffForTests(expired);
    await expect(completeHostedHandoff({
      record: expired,
      partnerId: app.partner_id,
      applicationId: app.id,
      publicReceiptId: "rcpt_x",
    })).rejects.toMatchObject({ code: "not_completable" });
    expect((await loadHandoff(record.handoff_ref))?.status).toBe("expired");
  });
});
