/**
 * Sovereign Launchpad HTTP route boundaries — PostgreSQL only (Build #744 Phase 2).
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import pg from "pg";
import { NextRequest } from "next/server";
import { resetAbraxasPgPoolForTests } from "@/lib/persistence/pgPool";
import { insertNativeAccount } from "@/lib/auth/nativeAccount/store";
import { enrollSandboxForAccount } from "@/lib/auth/nativeAccount/sandboxEnroll";
import { authenticatePartner } from "@/lib/partner/partnerAuth";

const integrationEnabled = process.env.ABRAXAS_SOVEREIGN_INTEGRATION_TEST === "1";
const sandboxEnabled = process.env.ABRAXAS_SOVEREIGN_SANDBOX_INTEGRATION === "1";
const databaseUrl = process.env.ABRAXAS_DATABASE_URL?.trim() ?? process.env.DATABASE_URL?.trim() ?? "";

const testEnv: Record<string, string> =
  integrationEnabled && sandboxEnabled && databaseUrl
    ? {
        ABRAXAS_SOVEREIGN_INTEGRATION_TEST: "1",
        ABRAXAS_SOVEREIGN_SANDBOX_INTEGRATION: "1",
        ABRAXAS_SOVEREIGN_NATIVE_ACCOUNT: "1",
        ABRAXAS_PERSISTENCE_BACKEND: "postgres_direct",
        ABRAXAS_DATABASE_URL: databaseUrl,
        ABRAXAS_NATIVE_ACCOUNT_MEMORY: "0",
        ABRAXAS_NATIVE_ACCOUNT_AUTH_ENABLED: "1",
        ABRAXAS_ACCOUNT_SESSION_SECRET: "ci-sovereign-integration-session-secret-32",
        ABRAXAS_BROWSER_SESSION_SECRET: "ci-sovereign-browser-session-secret-32",
        NODE_ENV: "test",
        VITEST: "true",
      }
    : {};

function partnerCookie(token: string): string {
  return `abraxas_partner_console_session=${token}`;
}

describe.runIf(integrationEnabled && sandboxEnabled && Boolean(databaseUrl))(
  "sovereign launchpad HTTP routes",
  () => {
    const accountId = `abx_ac_${"c".repeat(32)}`;
    let admin: pg.Client;
    let applicationId = "";
    let partnerId = "";
    let consoleToken = "";
    let apiKeyRaw = "";

    beforeAll(async () => {
      Object.assign(process.env, testEnv);
      resetAbraxasPgPoolForTests();
      admin = new pg.Client({ connectionString: databaseUrl });
      await admin.connect();
      await admin.query("delete from public.partner_launchpad_signed_receipts where partner_id like 'dev-%'");
      await admin.query("delete from public.partner_launchpad_verification_requests where partner_id like 'dev-%'");
      await admin.query("delete from public.partner_launchpad_usage_events where partner_id like 'dev-%'");
      await admin.query("delete from public.abraxas_sandbox_enrollments where account_id = $1", [accountId]);
      await admin.query("delete from public.abraxas_account_partner_memberships where account_id = $1", [accountId]);
      await admin.query("delete from public.partner_launchpad_activity where partner_id like 'dev-%'");
      await admin.query("delete from public.partner_launchpad_applications where partner_id like 'dev-%'");
      await admin.query("delete from public.partner_api_keys where partner_id like 'dev-%'");
      await admin.query("delete from public.partner_policies where partner_id like 'dev-%'");
      await admin.query("delete from public.partners where partner_id like 'dev-%'");
      await admin.query("delete from public.abraxas_accounts where account_id = $1", [accountId]);

      await insertNativeAccount(accountId);
      const enrolled = await enrollSandboxForAccount({
        accountId,
        applicationName: "HTTP Route Integration App",
      });
      if (!enrolled.ok) throw new Error(`enroll failed: ${enrolled.code}`);
      partnerId = enrolled.partnerId;
      applicationId = String(enrolled.application.application_id);
      consoleToken = enrolled.operatorSessionToken ?? "";
      apiKeyRaw = enrolled.apiKeyShownOnce ?? "";
    });

    afterAll(async () => {
      await admin?.end().catch(() => undefined);
      resetAbraxasPgPoolForTests();
    });

    it("exercises launchpad HTTP routes with real authorization", async () => {
      expect(consoleToken).toBeTruthy();
      expect(apiKeyRaw).toBeTruthy();

      const { GET: listApps } = await import("@/app/api/launchpad/applications/route");
      const listRes = await listApps(
        new NextRequest("http://localhost/api/launchpad/applications", {
          headers: { cookie: partnerCookie(consoleToken) },
        }),
      );
      expect(listRes.status).toBe(200);
      const listBody = await listRes.json();
      expect(listBody.ok).toBe(true);
      expect(listBody.workspace.applications.length).toBeGreaterThan(0);

      const { GET: getApp, PATCH: patchApp } = await import(
        `@/app/api/launchpad/applications/[id]/route`
      );
      const getRes = await getApp(
        new NextRequest(`http://localhost/api/launchpad/applications/${applicationId}`, {
          headers: { cookie: partnerCookie(consoleToken) },
        }),
        { params: { id: applicationId } },
      );
      expect(getRes.status).toBe(200);
      const appRow = (await getRes.json()).application;
      expect(appRow.policy_id).toBeTruthy();
      expect(appRow.key_prefix).toBeTruthy();

      const patchRes = await patchApp(
        new NextRequest(`http://localhost/api/launchpad/applications/${applicationId}`, {
          method: "PATCH",
          headers: { cookie: partnerCookie(consoleToken), "content-type": "application/json" },
          body: JSON.stringify({ display_name: "Updated HTTP App" }),
        }),
        { params: { id: applicationId } },
      );
      expect(patchRes.status).toBe(200);

      const { POST: addReturnUrl } = await import(
        `@/app/api/launchpad/applications/[id]/return-urls/route`
      );
      const returnRes = await addReturnUrl(
        new NextRequest(`http://localhost/api/launchpad/applications/${applicationId}/return-urls`, {
          method: "POST",
          headers: { cookie: partnerCookie(consoleToken), "content-type": "application/json" },
          body: JSON.stringify({ return_url: "https://shop.example.com/abraxas/callback" }),
        }),
        { params: { id: applicationId } },
      );
      expect(returnRes.status).toBe(200);

      const { POST: runTest } = await import(`@/app/api/launchpad/applications/[id]/test/route`);
      const testRes = await runTest(
        new NextRequest(`http://localhost/api/launchpad/applications/${applicationId}/test`, {
          method: "POST",
          headers: { cookie: partnerCookie(consoleToken), "content-type": "application/json" },
          body: JSON.stringify({ scenario_id: "approved" }),
        }),
        { params: { id: applicationId } },
      );
      expect(testRes.status).toBe(200);
      const testBody = await testRes.json();
      expect(testBody.result.passed).toBe(true);
      const receiptId = testBody.result.callback_params.receipt_id;

      const { GET: validateReceipt } = await import(
        `@/app/api/launchpad/applications/[id]/receipts/validate/route`
      );
      const validateRes = await validateReceipt(
        new NextRequest(
          `http://localhost/api/launchpad/applications/${applicationId}/receipts/validate?receipt_id=${encodeURIComponent(receiptId)}`,
          { headers: { cookie: partnerCookie(consoleToken) } },
        ),
        { params: { id: applicationId } },
      );
      expect(validateRes.status).toBe(200);
      const validateBody = await validateRes.json();
      expect(validateBody.signature_valid).toBe(true);

      const { GET: activity } = await import(
        `@/app/api/launchpad/applications/[id]/activity/route`
      );
      const activityRes = await activity(
        new NextRequest(`http://localhost/api/launchpad/applications/${applicationId}/activity`, {
          headers: { cookie: partnerCookie(consoleToken) },
        }),
        { params: { id: applicationId } },
      );
      expect(activityRes.status).toBe(200);
      expect((await activityRes.json()).events.length).toBeGreaterThan(0);

      const { GET: health } = await import(`@/app/api/launchpad/applications/[id]/health/route`);
      const healthRes = await health(
        new NextRequest(`http://localhost/api/launchpad/applications/${applicationId}/health`, {
          headers: { cookie: partnerCookie(consoleToken) },
        }),
        { params: { id: applicationId } },
      );
      expect(healthRes.status).toBe(200);

      const crossTenantGet = await getApp(
        new NextRequest(`http://localhost/api/launchpad/applications/${applicationId}`, {
          headers: { cookie: partnerCookie(consoleToken) },
        }),
        { params: { id: applicationId } },
      );
      expect(crossTenantGet.status).toBe(200);

      const { POST: rotateCred } = await import(
        `@/app/api/launchpad/applications/[id]/credentials/rotate/route`
      );
      const rotateRes = await rotateCred(
        new NextRequest(
          `http://localhost/api/launchpad/applications/${applicationId}/credentials/rotate`,
          { method: "POST", headers: { cookie: partnerCookie(consoleToken) } },
        ),
        { params: { id: applicationId } },
      );
      expect(rotateRes.status).toBe(200);
      const newKey = (await rotateRes.json()).api_key as string;

      const revokedKeyAuth = await authenticatePartner(
        new NextRequest("http://localhost/api/v1/partner", {
          headers: { authorization: `Bearer ${apiKeyRaw}` },
        }),
      );
      expect(revokedKeyAuth).toBeNull();

      const activeKeyAuth = await authenticatePartner(
        new NextRequest("http://localhost/api/v1/partner", {
          headers: { authorization: `Bearer ${newKey}` },
        }),
      );
      expect(activeKeyAuth?.ok).toBe(true);

      const { POST: revokeCred } = await import(
        `@/app/api/launchpad/applications/[id]/credentials/revoke/route`
      );
      const revokeRes = await revokeCred(
        new NextRequest(
          `http://localhost/api/launchpad/applications/${applicationId}/credentials/revoke`,
          { method: "POST", headers: { cookie: partnerCookie(consoleToken) } },
        ),
        { params: { id: applicationId } },
      );
      expect(revokeRes.status).toBe(200);

      const postRevokeAuth = await authenticatePartner(
        new NextRequest("http://localhost/api/v1/partner", {
          headers: { authorization: `Bearer ${newKey}` },
        }),
      );
      expect(postRevokeAuth).toBeNull();

      const { GET: verifyConfig } = await import("@/app/api/launchpad/public/verify-config/route");
      const slug = appRow.public_slug as string;
      const verifyConfigRes = await verifyConfig(
        new NextRequest(
          `http://localhost/api/launchpad/public/verify-config?app=${encodeURIComponent(slug)}&return_url=${encodeURIComponent("https://shop.example.com/abraxas/callback")}`,
        ),
      );
      expect(verifyConfigRes.status).toBe(200);
    });
  },
);
