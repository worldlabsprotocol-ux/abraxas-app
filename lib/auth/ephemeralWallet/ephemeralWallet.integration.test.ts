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
import {
  deriveEphemeralSandboxPossessionSecretKeyFromPublicWalletAddress,
  generateSandboxSessionPossessionKeyPair,
} from "./sandboxHolderPossessionKey.shared";
import { signPassportPossessionChallenge } from "@/lib/passport/reusableCredential/holderPossessionChallengeSigning";
import type { PassportPossessionChallengePayload } from "@/lib/passport/reusableCredential/holderPossessionChallenge";
import {
  buildEphemeralSandboxAgeTestCredential,
} from "@/lib/protocolVerification/ephemeralAuthorizedTestIssuer";

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
  expect(challengeBody.challenge.message).toContain("ABRAXAS — WALLET SIGN-IN");
  expect(challengeBody.challenge.display?.kind).toBe("wallet_sign_in");
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

type PreparedAgePresentation = {
  presentation_commit_id: string;
  possession_challenge: PassportPossessionChallengePayload;
  evidence: Record<string, unknown>;
  disclosure: Record<string, unknown>;
  test_only: boolean;
  possession_secret_key: Uint8Array;
};

async function prepareAgePresentation(input: {
  origin: string;
  sessionCookie: string;
  possessionKeyPair?: ReturnType<typeof generateSandboxSessionPossessionKeyPair>;
}): Promise<PreparedAgePresentation> {
  const possessionKeyPair = input.possessionKeyPair ?? generateSandboxSessionPossessionKeyPair();
  const { POST: preparePost } = await import("@/app/api/auth/wallet/sandbox/presentation/prepare/route");
  const prepareRes = await preparePost(
    new NextRequest(`${input.origin}/api/auth/wallet/sandbox/presentation/prepare`, {
      method: "POST",
      headers: {
        cookie: input.sessionCookie,
        origin: input.origin,
        host: "localhost:3000",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        policy_id: "age_21_retail",
        presentation_method_id: "authorized_test_issuer_credential",
        holder_possession_public_key: possessionKeyPair.publicKeyB64Url,
      }),
    }),
  );
  expect(prepareRes.status).toBe(200);
  const prepareBody = await prepareRes.json();
  expect(prepareBody.presentation_commit_id).toBeTruthy();
  expect(prepareBody.possession_challenge?.challenge_id).toBeTruthy();
  expect(prepareBody.evidence?.kind).toBe("passport_reusable_credential");
  expect(prepareBody.test_only).toBe(true);
  return { ...(prepareBody as Omit<PreparedAgePresentation, "possession_secret_key">), possession_secret_key: possessionKeyPair.secretKey };
}

async function authorizePresentationPossession(input: {
  origin: string;
  sessionCookie: string;
  wallet: string;
  prepared: PreparedAgePresentation;
  possessionSecretKey?: Uint8Array;
  challengeOverride?: PassportPossessionChallengePayload;
  proofSignatureOverride?: string;
  sessionCookieOverride?: string;
}) {
  const challenge = input.challengeOverride ?? input.prepared.possession_challenge;
  const secretKey = input.possessionSecretKey ?? input.prepared.possession_secret_key;
  const holder_possession_proof = {
    challenge_id: challenge.challenge_id,
    signature:
      input.proofSignatureOverride
      ?? signPassportPossessionChallenge(challenge, secretKey),
  };
  const { POST: authorizePost } = await import("@/app/api/auth/wallet/sandbox/presentation/authorize/route");
  return authorizePost(
    new NextRequest(`${input.origin}/api/auth/wallet/sandbox/presentation/authorize`, {
      method: "POST",
      headers: {
        cookie: input.sessionCookieOverride ?? input.sessionCookie,
        origin: input.origin,
        host: "localhost:3000",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        policy_id: "age_21_retail",
        presentation_commit_id: input.prepared.presentation_commit_id,
        challenge,
        holder_possession_proof,
        evidence: input.prepared.evidence,
      }),
    }),
  );
}

async function submitAgeTestVerify(input: {
  origin: string;
  cookie: string;
  workspaceId: string;
  action_challenge_id: string;
  signature: string;
  prepared: PreparedAgePresentation;
  policyId?: string;
  evidenceOverride?: Record<string, unknown>[];
}) {
  const { POST: testVerifyPost } = await import("@/app/api/auth/wallet/sandbox/test-verify/route");
  return testVerifyPost(
    new NextRequest(`${input.origin}/api/auth/wallet/sandbox/test-verify`, {
      method: "POST",
      headers: {
        cookie: input.cookie,
        origin: input.origin,
        host: "localhost:3000",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        policy_id: input.policyId ?? "age_21_retail",
        action_challenge_id: input.action_challenge_id,
        signature: input.signature,
        presentation_commit_id: input.prepared.presentation_commit_id,
        presentation_method_id: "authorized_test_issuer_credential",
        evidence: input.evidenceOverride ?? [input.prepared.evidence],
      }),
    }),
  );
}

function withTestIssuerEnabled<T>(fn: () => Promise<T>): Promise<T> {
  const previousIssuer = process.env[EPHEMERAL_SANDBOX_AUTHORIZED_TEST_ISSUER_ENV];
  const previousSalt = process.env.ABRAXAS_PSEUDONYM_SALT;
  Object.assign(process.env, {
    ...build546TrustRegistryEnv(),
    ...ephemeralSandboxTestIssuerTrustEnv(),
    [EPHEMERAL_SANDBOX_AUTHORIZED_TEST_ISSUER_ENV]: "1",
    ABRAXAS_PSEUDONYM_SALT: "ephemeral-integration-age-test",
  });
  return fn().finally(() => {
    if (previousIssuer === undefined) delete process.env[EPHEMERAL_SANDBOX_AUTHORIZED_TEST_ISSUER_ENV];
    else process.env[EPHEMERAL_SANDBOX_AUTHORIZED_TEST_ISSUER_ENV] = previousIssuer;
    if (previousSalt === undefined) delete process.env.ABRAXAS_PSEUDONYM_SALT;
    else process.env.ABRAXAS_PSEUDONYM_SALT = previousSalt;
  });
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
    await withTestIssuerEnabled(async () => {
      const { sessionCookie } = await signInWallet(keypair, wallet, origin);
      const { workspace, sessionCookie: sandboxCookie } = await openSandboxWorkspace(sessionCookie);
      const prepared = await prepareAgePresentation({ origin, sessionCookie: sandboxCookie });

      const possessionRes = await authorizePresentationPossession({
        origin,
        sessionCookie: sandboxCookie,
        wallet,
        prepared,
      });
      expect(possessionRes.status).toBe(200);
      expect((await possessionRes.json()).presentation_authorized).toBe(true);

      const testAction = await authorizeAction({
        keypair,
        wallet,
        origin,
        sessionCookie: sandboxCookie,
        operation: "sandbox:verification:test",
        resource: `abraxas:sandbox:${workspace.workspace_id}:policy:age_21_retail`,
        policyId: "age_21_retail",
      });
      const testRes = await submitAgeTestVerify({
        origin,
        cookie: testAction.cookie,
        workspaceId: workspace.workspace_id,
        action_challenge_id: testAction.action_challenge_id,
        signature: testAction.signature,
        prepared,
      });
      expect(testRes.status).toBe(200);
      const testBody = await testRes.json();
      expect(testBody.decision).toBe("approved");
      expect(testBody.test_only).toBe(true);
      expect(testBody.production_usable).toBe(false);

      const { POST: validatePost } = await import("@/app/api/auth/wallet/sandbox/validate/route");
      const validatePostRes = await validatePost(
        new NextRequest(`${origin}/api/auth/wallet/sandbox/validate`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ receipt: testBody.result }),
        }),
      );
      expect(validatePostRes.status).toBe(200);
      const validatePostBody = await validatePostRes.json();
      expect(validatePostBody.signature_authentic).toBe(true);
      expect(validatePostBody.production_usable).toBe(false);
    });
  });

  describe("age_21 presentation possession gate (test issuer enabled)", () => {
    it("rejects test-verify when possession authorization was not recorded", async () => {
      await withTestIssuerEnabled(async () => {
        const { sessionCookie } = await signInWallet(keypair, wallet, origin);
        const { workspace, sessionCookie: sandboxCookie } = await openSandboxWorkspace(sessionCookie);
        const prepared = await prepareAgePresentation({ origin, sessionCookie: sandboxCookie });
        const testAction = await authorizeAction({
          keypair,
          wallet,
          origin,
          sessionCookie: sandboxCookie,
          operation: "sandbox:verification:test",
          resource: `abraxas:sandbox:${workspace.workspace_id}:policy:age_21_retail`,
          policyId: "age_21_retail",
        });
        const testRes = await submitAgeTestVerify({
          origin,
          cookie: testAction.cookie,
          workspaceId: workspace.workspace_id,
          action_challenge_id: testAction.action_challenge_id,
          signature: testAction.signature,
          prepared,
        });
        expect(testRes.status).toBe(422);
        expect((await testRes.json()).code).toBe("presentation_possession_not_authorized");
      });
    });

    it("rejects invalid possession signature at authorize", async () => {
      await withTestIssuerEnabled(async () => {
        const { sessionCookie } = await signInWallet(keypair, wallet, origin);
        const { sessionCookie: sandboxCookie } = await openSandboxWorkspace(sessionCookie);
        const prepared = await prepareAgePresentation({ origin, sessionCookie: sandboxCookie });
        const possessionRes = await authorizePresentationPossession({
          origin,
          sessionCookie: sandboxCookie,
          wallet,
          prepared,
          proofSignatureOverride: Buffer.from("not-a-valid-signature").toString("base64url"),
        });
        expect(possessionRes.status).toBe(401);
        expect((await possessionRes.json()).code).toBe("possession_signature_invalid");
      });
    });

    it("rejects wallet-address-derived possession proof for session-bound credential", async () => {
      await withTestIssuerEnabled(async () => {
        const { sessionCookie } = await signInWallet(keypair, wallet, origin);
        const { sessionCookie: sandboxCookie } = await openSandboxWorkspace(sessionCookie);
        const prepared = await prepareAgePresentation({ origin, sessionCookie: sandboxCookie });
        const addressDerivedSecret = deriveEphemeralSandboxPossessionSecretKeyFromPublicWalletAddress(wallet);
        const possessionRes = await authorizePresentationPossession({
          origin,
          sessionCookie: sandboxCookie,
          wallet,
          prepared,
          possessionSecretKey: addressDerivedSecret,
        });
        expect(possessionRes.status).toBe(401);
        expect((await possessionRes.json()).code).toBe("possession_signature_invalid");
      });
    });

    it("rejects presentation authorize without authenticated wallet session", async () => {
      await withTestIssuerEnabled(async () => {
        const { sessionCookie } = await signInWallet(keypair, wallet, origin);
        const { sessionCookie: sandboxCookie } = await openSandboxWorkspace(sessionCookie);
        const prepared = await prepareAgePresentation({ origin, sessionCookie: sandboxCookie });
        const possessionRes = await authorizePresentationPossession({
          origin,
          sessionCookie: sandboxCookie,
          wallet,
          prepared,
          sessionCookieOverride: "",
        });
        expect(possessionRes.status).toBeGreaterThanOrEqual(401);
        expect(possessionRes.status).toBeLessThanOrEqual(403);
      });
    });

    it("rejects tampered possession challenge at authorize", async () => {
      await withTestIssuerEnabled(async () => {
        const { sessionCookie } = await signInWallet(keypair, wallet, origin);
        const { sessionCookie: sandboxCookie } = await openSandboxWorkspace(sessionCookie);
        const prepared = await prepareAgePresentation({ origin, sessionCookie: sandboxCookie });
        const expiredChallenge = {
          ...prepared.possession_challenge,
          expires_at: new Date(Date.now() - 60_000).toISOString(),
        };
        const possessionRes = await authorizePresentationPossession({
          origin,
          sessionCookie: sandboxCookie,
          wallet,
          prepared,
          challengeOverride: expiredChallenge,
        });
        expect(possessionRes.status).toBe(401);
        expect((await possessionRes.json()).code).toBe("challenge_substituted");
      });
    });

    it("rejects replayed possession authorization on the same commit", async () => {
      await withTestIssuerEnabled(async () => {
        const { sessionCookie } = await signInWallet(keypair, wallet, origin);
        const { sessionCookie: sandboxCookie } = await openSandboxWorkspace(sessionCookie);
        const prepared = await prepareAgePresentation({ origin, sessionCookie: sandboxCookie });
        const first = await authorizePresentationPossession({
          origin,
          sessionCookie: sandboxCookie,
          wallet,
          prepared,
        });
        expect(first.status).toBe(200);
        const replay = await authorizePresentationPossession({
          origin,
          sessionCookie: sandboxCookie,
          wallet,
          prepared,
        });
        expect(replay.status).toBe(409);
        expect((await replay.json()).code).toBe("presentation_possession_already_authorized");
      });
    });

    it("allows only one successful test-verify consumption per presentation commit", async () => {
      await withTestIssuerEnabled(async () => {
        const { sessionCookie } = await signInWallet(keypair, wallet, origin);
        const { workspace, sessionCookie: sandboxCookie } = await openSandboxWorkspace(sessionCookie);
        const prepared = await prepareAgePresentation({ origin, sessionCookie: sandboxCookie });
        expect((await authorizePresentationPossession({ origin, sessionCookie: sandboxCookie, wallet, prepared })).status).toBe(200);

        const testActionA = await authorizeAction({
          keypair,
          wallet,
          origin,
          sessionCookie: sandboxCookie,
          operation: "sandbox:verification:test",
          resource: `abraxas:sandbox:${workspace.workspace_id}:policy:age_21_retail`,
          policyId: "age_21_retail",
        });
        const first = await submitAgeTestVerify({
          origin,
          cookie: testActionA.cookie,
          workspaceId: workspace.workspace_id,
          action_challenge_id: testActionA.action_challenge_id,
          signature: testActionA.signature,
          prepared,
        });
        expect(first.status).toBe(200);

        const testActionB = await authorizeAction({
          keypair,
          wallet,
          origin,
          sessionCookie: sandboxCookie,
          operation: "sandbox:verification:test",
          resource: `abraxas:sandbox:${workspace.workspace_id}:policy:age_21_retail`,
          policyId: "age_21_retail",
        });
        const second = await submitAgeTestVerify({
          origin,
          cookie: testActionB.cookie,
          workspaceId: workspace.workspace_id,
          action_challenge_id: testActionB.action_challenge_id,
          signature: testActionB.signature,
          prepared,
        });
        expect(second.status).toBe(410);
        expect((await second.json()).code).toBe("presentation_commit_not_found");
      });
    });

    it("rejects substituted credential evidence at test-verify", async () => {
      await withTestIssuerEnabled(async () => {
        const other = Keypair.generate();
        const { sessionCookie } = await signInWallet(keypair, wallet, origin);
        const { workspace, sessionCookie: sandboxCookie } = await openSandboxWorkspace(sessionCookie);
        const prepared = await prepareAgePresentation({ origin, sessionCookie: sandboxCookie });
        expect((await authorizePresentationPossession({ origin, sessionCookie: sandboxCookie, wallet, prepared })).status).toBe(200);

        const substituted = buildEphemeralSandboxAgeTestCredential({ walletAddress: other.publicKey.toBase58() });
        const testAction = await authorizeAction({
          keypair,
          wallet,
          origin,
          sessionCookie: sandboxCookie,
          operation: "sandbox:verification:test",
          resource: `abraxas:sandbox:${workspace.workspace_id}:policy:age_21_retail`,
          policyId: "age_21_retail",
        });
        const testRes = await submitAgeTestVerify({
          origin,
          cookie: testAction.cookie,
          workspaceId: workspace.workspace_id,
          action_challenge_id: testAction.action_challenge_id,
          signature: testAction.signature,
          prepared,
          evidenceOverride: [
            {
              kind: "passport_reusable_credential",
              credential: substituted.credential,
              portable_revocation_snapshot: substituted.portable_revocation_snapshot,
            },
          ],
        });
        expect(testRes.status).toBe(422);
        expect((await testRes.json()).code).toBe("presentation_evidence_mismatch");
      });
    });

    it("rejects cross-policy wallet action reuse for age presentation commit", async () => {
      await withTestIssuerEnabled(async () => {
        const { sessionCookie } = await signInWallet(keypair, wallet, origin);
        const { workspace, sessionCookie: sandboxCookie } = await openSandboxWorkspace(sessionCookie);
        const prepared = await prepareAgePresentation({ origin, sessionCookie: sandboxCookie });
        expect((await authorizePresentationPossession({ origin, sessionCookie: sandboxCookie, wallet, prepared })).status).toBe(200);

        const testAction = await authorizeAction({
          keypair,
          wallet,
          origin,
          sessionCookie: sandboxCookie,
          operation: "sandbox:verification:test",
          resource: `abraxas:sandbox:${workspace.workspace_id}:policy:wallet_control`,
          policyId: "wallet_control",
        });
        const testRes = await submitAgeTestVerify({
          origin,
          cookie: testAction.cookie,
          workspaceId: workspace.workspace_id,
          action_challenge_id: testAction.action_challenge_id,
          signature: testAction.signature,
          prepared,
          policyId: "age_21_retail",
        });
        expect(testRes.status).toBe(401);
        expect((await testRes.json()).code).toBe("wrong_resource");
      });
    });

    it("denies revoked credential at policy execution after valid possession authorize", async () => {
      await withTestIssuerEnabled(async () => {
        const { sessionCookie } = await signInWallet(keypair, wallet, origin);
        const { workspace, sessionCookie: sandboxCookie } = await openSandboxWorkspace(sessionCookie);
        const prepared = await prepareAgePresentation({ origin, sessionCookie: sandboxCookie });
        expect((await authorizePresentationPossession({ origin, sessionCookie: sandboxCookie, wallet, prepared })).status).toBe(200);

        const revoked = buildEphemeralSandboxAgeTestCredential({ walletAddress: wallet, variant: "revoked" });
        const testAction = await authorizeAction({
          keypair,
          wallet,
          origin,
          sessionCookie: sandboxCookie,
          operation: "sandbox:verification:test",
          resource: `abraxas:sandbox:${workspace.workspace_id}:policy:age_21_retail`,
          policyId: "age_21_retail",
        });
        const testRes = await submitAgeTestVerify({
          origin,
          cookie: testAction.cookie,
          workspaceId: workspace.workspace_id,
          action_challenge_id: testAction.action_challenge_id,
          signature: testAction.signature,
          prepared,
          evidenceOverride: [
            {
              kind: "passport_reusable_credential",
              credential: revoked.credential,
              portable_revocation_snapshot: revoked.portable_revocation_snapshot,
            },
          ],
        });
        expect(testRes.status).toBe(422);
        expect((await testRes.json()).code).toBe("presentation_evidence_mismatch");
      });
    });

    it("denies untrusted issuer evidence substitution at test-verify", async () => {
      await withTestIssuerEnabled(async () => {
        const { sessionCookie } = await signInWallet(keypair, wallet, origin);
        const { workspace, sessionCookie: sandboxCookie } = await openSandboxWorkspace(sessionCookie);
        const prepared = await prepareAgePresentation({ origin, sessionCookie: sandboxCookie });
        expect((await authorizePresentationPossession({ origin, sessionCookie: sandboxCookie, wallet, prepared })).status).toBe(200);

        const badIssuer = buildEphemeralSandboxAgeTestCredential({ walletAddress: wallet, variant: "invalid_issuer" });
        const testAction = await authorizeAction({
          keypair,
          wallet,
          origin,
          sessionCookie: sandboxCookie,
          operation: "sandbox:verification:test",
          resource: `abraxas:sandbox:${workspace.workspace_id}:policy:age_21_retail`,
          policyId: "age_21_retail",
        });
        const testRes = await submitAgeTestVerify({
          origin,
          cookie: testAction.cookie,
          workspaceId: workspace.workspace_id,
          action_challenge_id: testAction.action_challenge_id,
          signature: testAction.signature,
          prepared,
          evidenceOverride: [
            {
              kind: "passport_reusable_credential",
              credential: badIssuer.credential,
              portable_revocation_snapshot: badIssuer.portable_revocation_snapshot,
            },
          ],
        });
        expect(testRes.status).toBe(422);
        expect((await testRes.json()).code).toBe("presentation_evidence_mismatch");
      });
    });
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
    const { GET: validateGet, POST: validatePost } = await import(
      "@/app/api/auth/wallet/sandbox/validate/route"
    );
    const validateRes = await validateGet(
      new NextRequest(
        `${origin}/api/auth/wallet/sandbox/validate?receipt_id=${encodeURIComponent(String(testBody.result.receipt_id))}`,
      ),
    );
    const validateBody = await validateRes.json();
    expect(validateBody.signature_valid).toBe(true);
    expect(validateBody.production_usable).toBe(false);
    expect(validateBody.checked_at).toBeTruthy();

    const validatePostRes = await validatePost(
      new NextRequest(`${origin}/api/auth/wallet/sandbox/validate`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ receipt: testBody.result }),
      }),
    );
    const validatePostBody = await validatePostRes.json();
    expect(validatePostRes.status).toBe(200);
    expect(validatePostBody.source).toBe("presented_receipt");
    expect(validatePostBody.signature_authentic).toBe(true);
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
