/**
 * Sovereign Launchpad E2E persistence — PostgreSQL only (Build #744).
 * CI: sovereign-native-account-pg with ABRAXAS_SOVEREIGN_SANDBOX_INTEGRATION=1
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import pg from "pg";
import { resetAbraxasPgPoolForTests } from "@/lib/persistence/pgPool";
import { insertNativeAccount } from "@/lib/auth/nativeAccount/store";
import { enrollSandboxForAccount } from "@/lib/auth/nativeAccount/sandboxEnroll";
import { getLaunchpadApplicationForPartner } from "@/lib/partner/launchpad/resolveLaunchpadApplication.server";
import { rotateLaunchpadCredential, revokeLaunchpadCredential } from "@/lib/partner/launchpad/credentialOps";
import { runLaunchpadTestScenario } from "@/lib/partner/launchpad/runTestScenario";
import { pgGetSignedReceiptForApplication } from "@/lib/partner/launchpad/sovereign/launchpadPgStore";
import { evaluatePublicReceiptTrust } from "@/lib/decisionReceipts/trustEvaluation";
import type { PartnerFlowPublicReceipt } from "@/lib/partner/verifyPartnerFlowReceipt";

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
        NODE_ENV: "test",
        VITEST: "true",
      }
    : {};

describe.runIf(integrationEnabled && sandboxEnabled && Boolean(databaseUrl))(
  "sovereign launchpad journey (PostgreSQL)",
  () => {
    const accountId = `abx_ac_${"b".repeat(32)}`;
    let admin: pg.Client;
    let applicationId = "";
    let partnerId = "";

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
    });

    afterAll(async () => {
      await admin?.end().catch(() => undefined);
      resetAbraxasPgPoolForTests();
    });

    it("runs enroll → resolve → harness → cryptographic receipt validation", async () => {
      await insertNativeAccount(accountId);
      const enrolled = await enrollSandboxForAccount({
        accountId,
        applicationName: "Build 744 Launchpad App",
      });
      expect(enrolled.ok).toBe(true);
      if (!enrolled.ok) return;

      partnerId = enrolled.partnerId;
      applicationId = String(enrolled.application.id);

      const crossTenant = await getLaunchpadApplicationForPartner(applicationId, "dev-other-tenant");
      expect(crossTenant).toBeNull();

      const app = await getLaunchpadApplicationForPartner(applicationId, partnerId);
      expect(app?.policy_id).toBeTruthy();
      expect(app?.api_key_id).toBeTruthy();

      const harness = await runLaunchpadTestScenario({
        applicationId,
        partnerId,
        scenarioId: "approved",
      });
      expect(harness.ok).toBe(true);
      if (!harness.ok) return;
      expect(harness.result.passed).toBe(true);

      const receiptId = harness.result.callback_params.receipt_id;
      const stored = await pgGetSignedReceiptForApplication({
        applicationId,
        partnerId,
        receiptId,
      });
      expect(stored?.signature).toBeTruthy();

      const trust = evaluatePublicReceiptTrust(stored!.public_payload as PartnerFlowPublicReceipt, {
        partnerId,
        policyId: app!.policy_id,
        allowSandbox: true,
      });
      expect(trust.signature_valid).toBe(true);

      const rotated = await rotateLaunchpadCredential(applicationId, partnerId);
      expect(rotated.ok).toBe(true);

      const revoked = await revokeLaunchpadCredential(applicationId, partnerId);
      expect(revoked.ok).toBe(true);
    });
  },
);
