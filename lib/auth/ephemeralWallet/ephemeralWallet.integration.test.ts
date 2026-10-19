/**
 * Ephemeral wallet auth — no PostgreSQL account tables required.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import nacl from "tweetnacl";
import { Keypair } from "@solana/web3.js";
import { resetEphemeralChallengeStoreForTests } from "./challengeStore";
import { resetEphemeralRedisClientForTests } from "./redisClient";
import { resetEphemeralSessionStoreForTests } from "./sessionStore";
import { resetEphemeralSandboxStoreForTests } from "./sandboxWorkspace";
import { resetEphemeralSandboxTestStoreForTests } from "./sandboxTestVerification";
import { resetSandboxPresentationCommitStoreForTests } from "./sandboxPresentationCommitStore";
import {
  EPHEMERAL_SANDBOX_AUTHORIZED_TEST_ISSUER_ENV,
  ephemeralSandboxTestIssuerTrustEnv,
} from "@/lib/protocolVerification/ephemeralAuthorizedTestIssuer";
import { build546TrustRegistryEnv } from "@/lib/institutionalCertification/build546/fixtures";
import { EPHEMERAL_WALLET_AUTH_PURPOSE } from "./message";
import { peekEphemeralWalletChallenge } from "./challengeStore";

const integrationEnabled = process.env.ABRAXAS_EPHEMERAL_INTEGRATION_TEST === "1";

const testEnv: Record<string, string> = integrationEnabled
  ? {
      ABRAXAS_EPHEMERAL_WALLET_AUTH: "1",
      ABRAXAS_EPHEMERAL_INTEGRATION_TEST: "1",
      ABRAXAS_EPHEMERAL_REVOCATION: "allowlist",
      ABRAXAS_ACCOUNT_SESSION_SECRET: "ephemeral-integration-session-secret-32",
      NEXT_PUBLIC_SOLANA_NETWORK: "devnet",
      NODE_ENV: "test",
      VITEST: "true",
    }
  : {};

async function signInWallet(keypair: Keypair, wallet: string, origin: string) {
  const { POST: challengePost } = await import("@/app/api/auth/wallet/solana/challenge/route");
  const challengeRes = await challengePost(
    new NextRequest(`${origin}/api/auth/wallet/solana/challenge`, {
      method: "POST",
      headers: { "content-type": "application/json", origin, host: "localhost:3000" },
      body: JSON.stringify({ wallet_address: wallet, solana_network: "devnet" }),
    }),
  );
  const challengeBody = await challengeRes.json();
  expect(challengeBody.challenge.message).toContain("abraxas_wallet_sign_in_v1");
  const messageBytes = new TextEncoder().encode(challengeBody.challenge.message);
  const signature = Buffer.from(nacl.sign.detached(messageBytes, keypair.secretKey)).toString("base64");
  const { POST: verifyPost } = await import("@/app/api/auth/wallet/solana/verify/route");
  const verifyRes = await verifyPost(
    new NextRequest(`${origin}/api/auth/wallet/solana/verify`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin,
        host: "localhost:3000",
        cookie: challengeRes.headers.get("set-cookie") ?? "",
      },
      body: JSON.stringify({
        challenge_id: challengeBody.challenge.challenge_id,
        wallet_address: wallet,
        solana_network: "devnet",
        signature,
      }),
    }),
  );
  return { verifyRes, sessionCookie: verifyRes.headers.get("set-cookie") ?? "" };
}

async function authorizeAction(input: {
  keypair: Keypair;
  wallet: string;
  origin: string;
  sessionCookie: string;
  operation: "sandbox:enter" | "sandbox:verification:test";
  resource: string;
  policyId?: string;
}) {
  const { POST: actionChallengePost } = await import("@/app/api/auth/wallet/solana/action/challenge/route");
  const actionChallengeRes = await actionChallengePost(
    new NextRequest(`${input.origin}/api/auth/wallet/solana/action/challenge`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: input.origin,
        host: "localhost:3000",
        cookie: input.sessionCookie,
      },
      body: JSON.stringify({
        operation: input.operation,
        resource: input.resource,
        policy_id: input.policyId,
        solana_network: "devnet",
      }),
    }),
  );
  const actionBody = await actionChallengeRes.json();
  if (input.operation === "sandbox:verification:test" && input.policyId) {
    expect(actionBody.challenge.message).toContain("Authorize test verification");
    expect(actionBody.challenge.message).toContain(input.policyId);
    expect(actionBody.challenge.display?.policy_id).toBe(input.policyId);
  }
  const msg = new TextEncoder().encode(actionBody.challenge.message);
  const sig = Buffer.from(nacl.sign.detached(msg, input.keypair.secretKey)).toString("base64");
  const cookies = [
    input.sessionCookie,
    actionChallengeRes.headers.get("set-cookie") ?? "",
  ]
    .filter(Boolean)
    .join("; ");
  return {
    action_challenge_id: actionBody.challenge.challenge_id as string,
    signature: sig,
    cookie: cookies,
  };
}

describe.runIf(integrationEnabled)("ephemeral wallet authentication", () => {
  const keypair = Keypair.generate();
  const wallet = keypair.publicKey.toBase58();
  const origin = "http://localhost:3000";

  beforeAll(() => {
    Object.assign(process.env, testEnv);
    resetEphemeralRedisClientForTests();
    resetEphemeralChallengeStoreForTests();
    resetEphemeralSessionStoreForTests();
    resetEphemeralSandboxStoreForTests();
    resetEphemeralSandboxTestStoreForTests();
    resetSandboxPresentationCommitStoreForTests();
  });

  afterAll(() => {
    resetEphemeralChallengeStoreForTests();
    resetEphemeralSessionStoreForTests();
    resetEphemeralSandboxStoreForTests();
    resetEphemeralSandboxTestStoreForTests();
    resetSandboxPresentationCommitStoreForTests();
  });

  it("issues session without creating a persistent account record", async () => {
    const { POST: challengePost } = await import("@/app/api/auth/wallet/solana/challenge/route");
    const challengeReq = new NextRequest(`${origin}/api/auth/wallet/solana/challenge`, {
      method: "POST",
      headers: { "content-type": "application/json", origin, host: "localhost:3000" },
      body: JSON.stringify({ wallet_address: wallet, solana_network: "devnet" }),
    });
    const challengeRes = await challengePost(challengeReq);
    expect(challengeRes.status).toBe(200);
    const challengeBody = await challengeRes.json();
    expect(challengeBody.challenge.message).toContain(EPHEMERAL_WALLET_AUTH_PURPOSE);

    const messageBytes = new TextEncoder().encode(challengeBody.challenge.message);
    const signatureBytes = nacl.sign.detached(messageBytes, keypair.secretKey);
    const signature = Buffer.from(signatureBytes).toString("base64");

    const ctxCookie = challengeRes.headers.get("set-cookie") ?? "";
    const { POST: verifyPost } = await import("@/app/api/auth/wallet/solana/verify/route");
    const verifyReq = new NextRequest(`${origin}/api/auth/wallet/solana/verify`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin,
        host: "localhost:3000",
        cookie: ctxCookie,
      },
      body: JSON.stringify({
        challenge_id: challengeBody.challenge.challenge_id,
        wallet_address: wallet,
        solana_network: "devnet",
        signature,
      }),
    });
    const verifyRes = await verifyPost(verifyReq);
    expect(verifyRes.status).toBe(200);
    const verifyBody = await verifyRes.json();
    expect(verifyBody.persistent_account_created).toBe(false);

    const sessionCookie = verifyRes.headers.get("set-cookie") ?? "";
    const { GET: sessionGet } = await import("@/app/api/auth/wallet/session/route");
    const sessionRes = await sessionGet(
      new NextRequest(`${origin}/api/auth/wallet/session`, {
        headers: { cookie: sessionCookie },
      }),
    );
    expect(sessionRes.status).toBe(200);
    const sessionBody = await sessionRes.json();
    expect(sessionBody.authenticated).toBe(true);
    expect(sessionBody.wallet_address).toBe(wallet);
    expect(sessionBody.scopes).toEqual(["wallet:session", "account:read"]);
    expect(sessionBody.scopes).not.toContain("sandbox:verification:test");

    const replayVerify = await verifyPost(
      new NextRequest(`${origin}/api/auth/wallet/solana/verify`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin,
          host: "localhost:3000",
          cookie: ctxCookie,
        },
        body: JSON.stringify({
          challenge_id: challengeBody.challenge.challenge_id,
          wallet_address: wallet,
          solana_network: "devnet",
          signature,
        }),
      }),
    );
    expect(replayVerify.status).toBe(409);
    expect((await replayVerify.json()).code).toBe("replay");

    const { DELETE: sessionDel } = await import("@/app/api/auth/wallet/session/route");
    const delRes = await sessionDel(
      new NextRequest(`${origin}/api/auth/wallet/session`, {
        method: "DELETE",
        headers: { cookie: sessionCookie },
      }),
    );
    expect(delRes.status).toBe(200);

    const afterRevoke = await sessionGet(
      new NextRequest(`${origin}/api/auth/wallet/session`, {
        headers: { cookie: sessionCookie },
      }),
    );
    expect((await afterRevoke.json()).authenticated).toBe(false);

    const capturedUse = await sessionGet(
      new NextRequest(`${origin}/api/auth/wallet/session`, {
        headers: { cookie: sessionCookie },
      }),
    );
    expect((await capturedUse.json()).authenticated).toBe(false);
  });

  it("opens sandbox workspace with wallet session binding (no redundant enter signature)", async () => {
    const { sessionCookie } = await signInWallet(keypair, wallet, origin);
    const { POST: enterPost } = await import("@/app/api/auth/wallet/sandbox/enter/route");
    const enterRes = await enterPost(
      new NextRequest(`${origin}/api/auth/wallet/sandbox/enter`, {
        method: "POST",
        headers: { cookie: sessionCookie, origin, host: "localhost:3000", "content-type": "application/json" },
        body: "{}",
      }),
    );
    expect(enterRes.status).toBe(200);
    const body = await enterRes.json();
    expect(body.workspace?.workspace_id).toMatch(/^esbx_/);
    expect(body.authorization_mode).toBe("wallet_session");
  });

  async function openSandboxWorkspace(sessionCookie: string) {
    const { POST: enterPost } = await import("@/app/api/auth/wallet/sandbox/enter/route");
    const enterRes = await enterPost(
      new NextRequest(`${origin}/api/auth/wallet/sandbox/enter`, {
        method: "POST",
        headers: {
          cookie: sessionCookie,
          origin,
          host: "localhost:3000",
          "content-type": "application/json",
        },
        body: "{}",
      }),
    );
    expect(enterRes.status).toBe(200);
    const workspace = (await enterRes.json()).workspace as { workspace_id: string };
    return { workspace, sessionCookie };
  }

  it("blocks age_21 when sandbox test issuer is unavailable", async () => {
    const { sessionCookie } = await signInWallet(keypair, wallet, origin);
    const { workspace, sessionCookie: sandboxCookie } = await openSandboxWorkspace(sessionCookie);

    const testAction = await authorizeAction({
      keypair,
      wallet,
      origin,
      sessionCookie: sandboxCookie,
      operation: "sandbox:verification:test",
      resource: `abraxas:sandbox:${workspace.workspace_id}:policy:age_21_retail`,
      policyId: "age_21_retail",
    });
    const { POST: testVerifyPost } = await import("@/app/api/auth/wallet/sandbox/test-verify/route");
    const testRes = await testVerifyPost(
      new NextRequest(`${origin}/api/auth/wallet/sandbox/test-verify`, {
        method: "POST",
        headers: {
          cookie: testAction.cookie,
          origin,
          host: "localhost:3000",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          policy_id: "age_21_retail",
          action_challenge_id: testAction.action_challenge_id,
          signature: testAction.signature,
        }),
      }),
    );
    expect(testRes.status).toBe(422);
    expect((await testRes.json()).code).toBe("evidence_unavailable");
  });

  it("completes age_21 test with bound presentation commit when test issuer is enabled", async () => {
    const previousIssuer = process.env[EPHEMERAL_SANDBOX_AUTHORIZED_TEST_ISSUER_ENV];
    Object.assign(process.env, {
      ...build546TrustRegistryEnv(),
      ...ephemeralSandboxTestIssuerTrustEnv(),
      [EPHEMERAL_SANDBOX_AUTHORIZED_TEST_ISSUER_ENV]: "1",
      ABRAXAS_PSEUDONYM_SALT: "ephemeral-integration-age-test",
    });
    try {
      const { sessionCookie } = await signInWallet(keypair, wallet, origin);
      const { workspace, sessionCookie: sandboxCookie } = await openSandboxWorkspace(sessionCookie);
      const { POST: preparePost } = await import("@/app/api/auth/wallet/sandbox/presentation/prepare/route");
      const prepareRes = await preparePost(
        new NextRequest(`${origin}/api/auth/wallet/sandbox/presentation/prepare`, {
          method: "POST",
          headers: {
            cookie: sandboxCookie,
            origin,
            host: "localhost:3000",
            "content-type": "application/json",
          },
          body: JSON.stringify({
            policy_id: "age_21_retail",
            presentation_method_id: "authorized_test_issuer_credential",
          }),
        }),
      );
      expect(prepareRes.status).toBe(200);
      const prepareBody = await prepareRes.json();
      expect(prepareBody.presentation_commit_id).toBeTruthy();
      expect(prepareBody.test_only).toBe(true);

      const testAction = await authorizeAction({
        keypair,
        wallet,
        origin,
        sessionCookie: sandboxCookie,
        operation: "sandbox:verification:test",
        resource: `abraxas:sandbox:${workspace.workspace_id}:policy:age_21_retail`,
        policyId: "age_21_retail",
      });
      const { POST: testVerifyPost } = await import("@/app/api/auth/wallet/sandbox/test-verify/route");
      const testRes = await testVerifyPost(
        new NextRequest(`${origin}/api/auth/wallet/sandbox/test-verify`, {
          method: "POST",
          headers: {
            cookie: testAction.cookie,
            origin,
            host: "localhost:3000",
            "content-type": "application/json",
          },
          body: JSON.stringify({
            policy_id: "age_21_retail",
            action_challenge_id: testAction.action_challenge_id,
            signature: testAction.signature,
            presentation_commit_id: prepareBody.presentation_commit_id,
            presentation_method_id: "authorized_test_issuer_credential",
            evidence: [prepareBody.evidence],
          }),
        }),
      );
      expect(testRes.status).toBe(200);
      const testBody = await testRes.json();
      expect(testBody.decision).toBe("approved");
      expect(testBody.test_only).toBe(true);
      expect(testBody.production_usable).toBe(false);
    } finally {
      if (previousIssuer === undefined) delete process.env[EPHEMERAL_SANDBOX_AUTHORIZED_TEST_ISSUER_ENV];
      else process.env[EPHEMERAL_SANDBOX_AUTHORIZED_TEST_ISSUER_ENV] = previousIssuer;
    }
  });

  it("completes temporary sandbox test verification journey (wallet_control)", async () => {
    const { sessionCookie } = await signInWallet(keypair, wallet, origin);
    const { workspace, sessionCookie: sandboxCookie } = await openSandboxWorkspace(sessionCookie);

    const policyId = "wallet_control";
    const testAction = await authorizeAction({
      keypair,
      wallet,
      origin,
      sessionCookie: sandboxCookie,
      operation: "sandbox:verification:test",
      resource: `abraxas:sandbox:${workspace.workspace_id}:policy:${policyId}`,
      policyId,
    });
    const { POST: testVerifyPost } = await import("@/app/api/auth/wallet/sandbox/test-verify/route");
    const testRes = await testVerifyPost(
      new NextRequest(`${origin}/api/auth/wallet/sandbox/test-verify`, {
        method: "POST",
        headers: {
          cookie: testAction.cookie,
          origin,
          host: "localhost:3000",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          policy_id: policyId,
          action_challenge_id: testAction.action_challenge_id,
          signature: testAction.signature,
        }),
      }),
    );
    expect(testRes.status).toBe(200);
    const testBody = await testRes.json();
    expect(testBody.decision).toBe("approved");
    expect(testBody.result.result_label).toBe("ephemeral_sandbox_test_only");
    expect(testBody.production_usable).toBe(false);
    const { GET: validateGet } = await import("@/app/api/auth/wallet/sandbox/validate/route");
    const validateRes = await validateGet(
      new NextRequest(
        `${origin}/api/auth/wallet/sandbox/validate?receipt_id=${encodeURIComponent(String(testBody.result.receipt_id))}`,
      ),
    );
    const validateBody = await validateRes.json();
    expect(validateBody.signature_valid).toBe(true);
    expect(validateBody.production_usable).toBe(false);
  });

  it("rejects wrong signer", async () => {
    const { POST: challengePost } = await import("@/app/api/auth/wallet/solana/challenge/route");
    const challengeRes = await challengePost(
      new NextRequest(`${origin}/api/auth/wallet/solana/challenge`, {
        method: "POST",
        headers: { "content-type": "application/json", origin, host: "localhost:3000" },
        body: JSON.stringify({ wallet_address: wallet, solana_network: "devnet" }),
      }),
    );
    const challengeBody = await challengeRes.json();
    const other = Keypair.generate();
    const messageBytes = new TextEncoder().encode(challengeBody.challenge.message);
    const signature = Buffer.from(nacl.sign.detached(messageBytes, keypair.secretKey)).toString("base64");
    const { POST: verifyPost } = await import("@/app/api/auth/wallet/solana/verify/route");
    const verifyRes = await verifyPost(
      new NextRequest(`${origin}/api/auth/wallet/solana/verify`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin,
          host: "localhost:3000",
          cookie: challengeRes.headers.get("set-cookie") ?? "",
        },
        body: JSON.stringify({
          challenge_id: challengeBody.challenge.challenge_id,
          wallet_address: other.publicKey.toBase58(),
          solana_network: "devnet",
          signature,
        }),
      }),
    );
    expect(verifyRes.status).toBe(401);
    expect((await verifyRes.json()).code).toBe("wrong_signer");
    const stillThere = await peekEphemeralWalletChallenge(challengeBody.challenge.challenge_id);
    expect(stillThere?.challenge_id).toBe(challengeBody.challenge.challenge_id);
  });

  it("rejects invalid signature without consuming challenge", async () => {
    const { POST: challengePost } = await import("@/app/api/auth/wallet/solana/challenge/route");
    const challengeRes = await challengePost(
      new NextRequest(`${origin}/api/auth/wallet/solana/challenge`, {
        method: "POST",
        headers: { "content-type": "application/json", origin, host: "localhost:3000" },
        body: JSON.stringify({ wallet_address: wallet, solana_network: "devnet" }),
      }),
    );
    const challengeBody = await challengeRes.json();
    const { POST: verifyPost } = await import("@/app/api/auth/wallet/solana/verify/route");
    const verifyRes = await verifyPost(
      new NextRequest(`${origin}/api/auth/wallet/solana/verify`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin,
          host: "localhost:3000",
          cookie: challengeRes.headers.get("set-cookie") ?? "",
        },
        body: JSON.stringify({
          challenge_id: challengeBody.challenge.challenge_id,
          wallet_address: wallet,
          solana_network: "devnet",
          signature: Buffer.from("invalid").toString("base64"),
        }),
      }),
    );
    expect(verifyRes.status).toBe(401);
    expect((await verifyRes.json()).code).toBe("invalid_signature");
    expect(await peekEphemeralWalletChallenge(challengeBody.challenge.challenge_id)).not.toBeNull();
  });
});
