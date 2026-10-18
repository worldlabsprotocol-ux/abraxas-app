/**
 * Sovereign native account persistence — real PostgreSQL (no Supabase SDK).
 * CI: sovereign-native-account-pg job. Local: ABRAXAS_DATABASE_URL + apply migrations script.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import pg from "pg";
import { resetAbraxasPgPoolForTests } from "@/lib/persistence/pgPool";
import {
  insertNativeAccount,
  getNativeAccountStatus,
} from "@/lib/auth/nativeAccount/store";
import {
  createAccountSessionId,
  insertAccountSessionRecord,
  isAccountSessionActive,
  revokeAccountSession,
} from "@/lib/auth/nativeAccount/accountSessionStore";
import {
  createAccountSolChallengeId,
  insertAccountSolanaChallenge,
  consumeAccountSolanaChallenge,
} from "@/lib/auth/nativeAccount/solanaAuth/store";
import {
  hashAccountSolSessionContext,
  linkSolanaWalletToAccount,
  findAccountIdBySolanaWallet,
} from "@/lib/auth/nativeAccount/solanaAuth/store";
import { enrollSandboxForAccount } from "@/lib/auth/nativeAccount/sandboxEnroll";
import { getPrimarySandboxEnrollment } from "@/lib/auth/nativeAccount/store";
import { buildLaunchpadWorkspaceView } from "@/lib/partner/launchpad/workspaceView";

const integrationEnabled = process.env.ABRAXAS_SOVEREIGN_INTEGRATION_TEST === "1";
const databaseUrl = process.env.ABRAXAS_DATABASE_URL?.trim()
  ?? process.env.DATABASE_URL?.trim()
  ?? "";

const testEnv: Record<string, string> = integrationEnabled && databaseUrl
  ? {
      ABRAXAS_SOVEREIGN_INTEGRATION_TEST: "1",
      ABRAXAS_SOVEREIGN_NATIVE_ACCOUNT: "1",
      ABRAXAS_PERSISTENCE_BACKEND: "postgres_direct",
      ABRAXAS_DATABASE_URL: databaseUrl,
      ABRAXAS_NATIVE_ACCOUNT_MEMORY: "0",
      ABRAXAS_NATIVE_ACCOUNT_AUTH_ENABLED: "1",
      ABRAXAS_ACCOUNT_SESSION_SECRET: "integration-test-session-secret-32b",
      NODE_ENV: "test",
      VITEST: "true",
    }
  : {};

describe.runIf(integrationEnabled && Boolean(databaseUrl))("sovereign native account PostgreSQL", () => {
  const accountId = `abx_ac_${"a".repeat(32)}`;
  let admin: pg.Client;

  beforeAll(async () => {
    Object.assign(process.env, testEnv);
    resetAbraxasPgPoolForTests();
    admin = new pg.Client({ connectionString: databaseUrl });
    await admin.connect();
    await admin.query("delete from public.abraxas_account_sessions where account_id = $1", [accountId]);
    await admin.query("delete from public.abraxas_account_solana_auth_challenges where wallet_address = $1", [
      "So11111111111111111111111111111111111111112",
    ]);
    await admin.query("delete from public.abraxas_sandbox_enrollments where account_id = $1", [accountId]);
    await admin.query("delete from public.abraxas_account_partner_memberships where account_id = $1", [accountId]);
    await admin.query(
      `delete from public.partner_launchpad_activity where partner_id like 'dev-%'`,
    );
    await admin.query(
      `delete from public.partner_launchpad_applications where partner_id like 'dev-%'`,
    );
    await admin.query(`delete from public.partner_api_keys where partner_id like 'dev-%'`);
    await admin.query(`delete from public.partner_policies where partner_id like 'dev-%'`);
    await admin.query(`delete from public.partners where partner_id like 'dev-%'`);
    await admin.query("delete from public.abraxas_account_solana_wallets where account_id = $1", [accountId]);
    await admin.query("delete from public.abraxas_accounts where account_id = $1", [accountId]);
  });

  afterAll(async () => {
    await admin?.end().catch(() => undefined);
    resetAbraxasPgPoolForTests();
  });

  it("persists account, atomic solana challenge, and revocable session without Supabase", async () => {
    await insertNativeAccount(accountId);
    expect(await getNativeAccountStatus(accountId)).toBe("active");

    const challengeId = createAccountSolChallengeId();
    const ctxHash = hashAccountSolSessionContext("integration-test-context");
    const expiresAt = new Date(Date.now() + 5 * 60_000).toISOString();
    await insertAccountSolanaChallenge({
      id: challengeId,
      wallet_address: "So11111111111111111111111111111111111111112",
      solana_network: "devnet",
      origin: "https://abraxas.test",
      uri: "https://abraxas.test",
      request_id: "req-integration",
      session_context_hash: ctxHash,
      nonce: `nonce-${Date.now()}`,
      message: "Sign in to Abraxas",
      expires_at: expiresAt,
    });

    const consumed = await consumeAccountSolanaChallenge({
      challengeId,
      walletAddress: "So11111111111111111111111111111111111111112",
      sessionContextHash: ctxHash,
    });
    expect(consumed?.message).toBe("Sign in to Abraxas");

    const replay = await consumeAccountSolanaChallenge({
      challengeId,
      walletAddress: "So11111111111111111111111111111111111111112",
      sessionContextHash: ctxHash,
    });
    expect(replay).toBeNull();

    const sessionId = createAccountSessionId();
    const sessionExpires = new Date(Date.now() + 60 * 60_000).toISOString();
    await insertAccountSessionRecord({
      sessionId,
      accountId,
      authMethod: "solana_wallet",
      expiresAt: sessionExpires,
    });
    expect(await isAccountSessionActive(sessionId, accountId)).toBe(true);

    expect(await revokeAccountSession(sessionId, accountId, "sign_out")).toBe(true);
    expect(await isAccountSessionActive(sessionId, accountId)).toBe(false);

    await linkSolanaWalletToAccount({
      accountId,
      walletAddress: "So11111111111111111111111111111111111111112",
      solanaNetwork: "devnet",
    });
    expect(await findAccountIdBySolanaWallet("So11111111111111111111111111111111111111112", "devnet")).toBe(
      accountId,
    );
  });

  it.runIf(process.env.ABRAXAS_SOVEREIGN_SANDBOX_INTEGRATION === "1")(
    "enrolls sandbox via sovereign transaction and resolves workspace",
    async () => {
      await insertNativeAccount(accountId);

      const first = await enrollSandboxForAccount({ accountId, applicationName: "Sovereign Test App" });
      expect(first.ok).toBe(true);
      if (!first.ok) return;

      const replay = await enrollSandboxForAccount({ accountId });
      expect(replay.ok).toBe(true);
      if (replay.ok) {
        expect(replay.application.idempotency_replay).toBe(true);
      }

      const enrollment = await getPrimarySandboxEnrollment(accountId);
      expect(enrollment?.partner_id).toBeTruthy();

      const workspace = await buildLaunchpadWorkspaceView(enrollment!.partner_id);
      expect(workspace?.applications.length).toBeGreaterThan(0);
    },
  );
});
