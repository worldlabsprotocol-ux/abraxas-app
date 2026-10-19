// FILE: lib/institutionalCertification/build762/ephemeralSandboxTrustJourney.ts
// Real HTTP route execution for Developer Workspace sandbox institutional trust (test issuer).

import { NextRequest } from "next/server";
import nacl from "tweetnacl";
import { Keypair } from "@solana/web3.js";
import { resetEphemeralChallengeStoreForTests } from "@/lib/auth/ephemeralWallet/challengeStore";
import { resetEphemeralRedisClientForTests } from "@/lib/auth/ephemeralWallet/redisClient";
import { resetEphemeralSessionStoreForTests } from "@/lib/auth/ephemeralWallet/sessionStore";
import { resetEphemeralSandboxStoreForTests } from "@/lib/auth/ephemeralWallet/sandboxWorkspace";
import { resetEphemeralSandboxTestStoreForTests } from "@/lib/auth/ephemeralWallet/sandboxTestVerification";
import { resetSandboxPresentationCommitStoreForTests } from "@/lib/auth/ephemeralWallet/sandboxPresentationCommitStore";
import {
  EPHEMERAL_SANDBOX_AUTHORIZED_TEST_ISSUER_ENV,
  ephemeralSandboxTestIssuerTrustEnv,
} from "@/lib/protocolVerification/ephemeralAuthorizedTestIssuer";
import { build546TrustRegistryEnv } from "@/lib/institutionalCertification/build546/fixtures";
import { EPHEMERAL_SANDBOX_TEST_PARTNER_ID } from "@/lib/auth/ephemeralWallet/sandboxTestPolicies";
import {
  generateSandboxSessionPossessionKeyPair,
} from "@/lib/auth/ephemeralWallet/sandboxHolderPossessionKey.shared";
import { signPassportPossessionChallenge } from "@/lib/passport/reusableCredential/holderPossessionChallengeSigning";
import type { PassportPossessionChallengePayload } from "@/lib/passport/reusableCredential/holderPossessionChallenge";
import { buildSandboxReceiptValidationPayload } from "@/lib/auth/ephemeralWallet/sandboxReceiptValidationResponse";
import type { PartnerFlowPublicReceipt } from "@/lib/partner/verifyPartnerFlowReceipt";

const ORIGIN = "http://localhost:3000";
const POLICY_ID = "age_21_retail";

export type EphemeralSandboxTrustJourneyResult = {
  wallet: string;
  workspace_id: string;
  presentation_commit_id: string;
  action_challenge_id: string;
  receipt: PartnerFlowPublicReceipt;
  decision: string;
  independent: Awaited<ReturnType<typeof buildSandboxReceiptValidationPayload>>;
};

const BASE_TEST_ENV: Record<string, string> = {
  ABRAXAS_EPHEMERAL_WALLET_AUTH: "1",
  ABRAXAS_EPHEMERAL_INTEGRATION_TEST: "1",
  ABRAXAS_EPHEMERAL_REVOCATION: "allowlist",
  ABRAXAS_ACCOUNT_SESSION_SECRET: "build-762-institutional-trust-session-secret",
  NEXT_PUBLIC_SOLANA_NETWORK: "devnet",
  NODE_ENV: "test",
  VITEST: "true",
};

export function applyBuild762TestEnvironment(): void {
  Object.assign(process.env, BASE_TEST_ENV, {
    ...build546TrustRegistryEnv(),
    ...ephemeralSandboxTestIssuerTrustEnv(),
    [EPHEMERAL_SANDBOX_AUTHORIZED_TEST_ISSUER_ENV]: "1",
    ABRAXAS_PSEUDONYM_SALT: "build-762-institutional-trust",
  });
  resetEphemeralRedisClientForTests();
  resetEphemeralChallengeStoreForTests();
  resetEphemeralSessionStoreForTests();
  resetEphemeralSandboxStoreForTests();
  resetEphemeralSandboxTestStoreForTests();
  resetSandboxPresentationCommitStoreForTests();
}

async function signInWallet(keypair: Keypair): Promise<string> {
  const wallet = keypair.publicKey.toBase58();
  const { POST: challengePost } = await import("@/app/api/auth/wallet/solana/challenge/route");
  const challengeRes = await challengePost(
    new NextRequest(`${ORIGIN}/api/auth/wallet/solana/challenge`, {
      method: "POST",
      headers: { "content-type": "application/json", origin: ORIGIN, host: "localhost:3000" },
      body: JSON.stringify({ wallet_address: wallet, solana_network: "devnet" }),
    }),
  );
  if (challengeRes.status !== 200) {
    throw new Error(`wallet_challenge_failed:${challengeRes.status}`);
  }
  const challengeBody = await challengeRes.json();
  const messageBytes = new TextEncoder().encode(challengeBody.challenge.message);
  const signature = Buffer.from(nacl.sign.detached(messageBytes, keypair.secretKey)).toString("base64");
  const { POST: verifyPost } = await import("@/app/api/auth/wallet/solana/verify/route");
  const verifyRes = await verifyPost(
    new NextRequest(`${ORIGIN}/api/auth/wallet/solana/verify`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: ORIGIN,
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
  if (verifyRes.status !== 200) {
    throw new Error(`wallet_verify_failed:${verifyRes.status}`);
  }
  return verifyRes.headers.get("set-cookie") ?? "";
}

async function openWorkspace(sessionCookie: string): Promise<{ workspace_id: string; cookie: string }> {
  const { POST: enterPost } = await import("@/app/api/auth/wallet/sandbox/enter/route");
  const enterRes = await enterPost(
    new NextRequest(`${ORIGIN}/api/auth/wallet/sandbox/enter`, {
      method: "POST",
      headers: {
        cookie: sessionCookie,
        origin: ORIGIN,
        host: "localhost:3000",
        "content-type": "application/json",
      },
      body: "{}",
    }),
  );
  if (enterRes.status !== 200) {
    throw new Error(`sandbox_enter_failed:${enterRes.status}`);
  }
  const body = await enterRes.json();
  const workspace_id = String(body.workspace?.workspace_id ?? "");
  if (!workspace_id) throw new Error("sandbox_workspace_missing");
  return { workspace_id, cookie: sessionCookie };
}

type PreparedPresentation = {
  presentation_commit_id: string;
  possession_challenge: PassportPossessionChallengePayload;
  evidence: Record<string, unknown>;
  possession_secret_key: Uint8Array;
};

async function preparePresentation(sessionCookie: string): Promise<PreparedPresentation> {
  const possessionKeyPair = generateSandboxSessionPossessionKeyPair();
  const { POST: preparePost } = await import("@/app/api/auth/wallet/sandbox/presentation/prepare/route");
  const prepareRes = await preparePost(
    new NextRequest(`${ORIGIN}/api/auth/wallet/sandbox/presentation/prepare`, {
      method: "POST",
      headers: {
        cookie: sessionCookie,
        origin: ORIGIN,
        host: "localhost:3000",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        policy_id: POLICY_ID,
        presentation_method_id: "authorized_test_issuer_credential",
        holder_possession_public_key: possessionKeyPair.publicKeyB64Url,
      }),
    }),
  );
  if (prepareRes.status !== 200) {
    const code = (await prepareRes.json()) as { code?: string };
    throw new Error(`presentation_prepare_failed:${code.code ?? prepareRes.status}`);
  }
  const body = await prepareRes.json();
  return {
    presentation_commit_id: body.presentation_commit_id,
    possession_challenge: body.possession_challenge,
    evidence: body.evidence,
    possession_secret_key: possessionKeyPair.secretKey,
  };
}

async function authorizePresentation(input: {
  sessionCookie: string;
  prepared: PreparedPresentation;
  sessionCookieOverride?: string;
  possessionSecretOverride?: Uint8Array;
}): Promise<Response> {
  const challenge = input.prepared.possession_challenge;
  const secretKey = input.possessionSecretOverride ?? input.prepared.possession_secret_key;
  const holder_possession_proof = {
    challenge_id: challenge.challenge_id,
    signature: signPassportPossessionChallenge(challenge, secretKey),
  };
  const { POST: authorizePost } = await import("@/app/api/auth/wallet/sandbox/presentation/authorize/route");
  return authorizePost(
    new NextRequest(`${ORIGIN}/api/auth/wallet/sandbox/presentation/authorize`, {
      method: "POST",
      headers: {
        cookie: input.sessionCookieOverride ?? input.sessionCookie,
        origin: ORIGIN,
        host: "localhost:3000",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        policy_id: POLICY_ID,
        presentation_commit_id: input.prepared.presentation_commit_id,
        challenge,
        holder_possession_proof,
        evidence: input.prepared.evidence,
      }),
    }),
  );
}

async function walletActionChallenge(input: {
  sessionCookie: string;
  workspaceId: string;
  keypair: Keypair;
  policyId?: string;
  resourceSuffix?: string;
}): Promise<{ action_challenge_id: string; signature: string; cookie: string }> {
  const policyId = input.policyId ?? POLICY_ID;
  const resource =
    input.resourceSuffix
    ?? `abraxas:sandbox:${input.workspaceId}:policy:${policyId}`;
  const { POST: actionChallengePost } = await import("@/app/api/auth/wallet/solana/action/challenge/route");
  const actionChallengeRes = await actionChallengePost(
    new NextRequest(`${ORIGIN}/api/auth/wallet/solana/action/challenge`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: ORIGIN,
        host: "localhost:3000",
        cookie: input.sessionCookie,
      },
      body: JSON.stringify({
        operation: "sandbox:verification:test",
        resource,
        policy_id: policyId,
        solana_network: "devnet",
      }),
    }),
  );
  if (actionChallengeRes.status !== 200) {
    throw new Error(`action_challenge_failed:${actionChallengeRes.status}`);
  }
  const actionBody = await actionChallengeRes.json();
  const msg = new TextEncoder().encode(actionBody.challenge.message);
  const sig = Buffer.from(nacl.sign.detached(msg, input.keypair.secretKey)).toString("base64");
  const cookies = [input.sessionCookie, actionChallengeRes.headers.get("set-cookie") ?? ""]
    .filter(Boolean)
    .join("; ");
  return {
    action_challenge_id: actionBody.challenge.challenge_id as string,
    signature: sig,
    cookie: cookies,
  };
}

async function testVerify(input: {
  cookie: string;
  workspaceId: string;
  prepared: PreparedPresentation;
  action_challenge_id: string;
  signature: string;
  policyId?: string;
  evidenceOverride?: Record<string, unknown>[];
}): Promise<Response> {
  const { POST: testVerifyPost } = await import("@/app/api/auth/wallet/sandbox/test-verify/route");
  return testVerifyPost(
    new NextRequest(`${ORIGIN}/api/auth/wallet/sandbox/test-verify`, {
      method: "POST",
      headers: {
        cookie: input.cookie,
        origin: ORIGIN,
        host: "localhost:3000",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        policy_id: input.policyId ?? POLICY_ID,
        action_challenge_id: input.action_challenge_id,
        signature: input.signature,
        presentation_commit_id: input.prepared.presentation_commit_id,
        presentation_method_id: "authorized_test_issuer_credential",
        evidence: input.evidenceOverride ?? [input.prepared.evidence],
      }),
    }),
  );
}

async function validatePresentedReceipt(receipt: PartnerFlowPublicReceipt) {
  const { POST: validatePost } = await import("@/app/api/auth/wallet/sandbox/validate/route");
  const res = await validatePost(
    new NextRequest(`${ORIGIN}/api/auth/wallet/sandbox/validate`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ receipt }),
    }),
  );
  const body = await res.json();
  return { status: res.status, body };
}

export async function runEphemeralSandboxTrustHappyPath(
  keypair: Keypair = Keypair.generate(),
): Promise<EphemeralSandboxTrustJourneyResult> {
  applyBuild762TestEnvironment();
  const sessionCookie = await signInWallet(keypair);
  const { workspace_id, cookie: sandboxCookie } = await openWorkspace(sessionCookie);
  const prepared = await preparePresentation(sandboxCookie);
  const possessionRes = await authorizePresentation({ sessionCookie: sandboxCookie, prepared });
  if (possessionRes.status !== 200) {
    throw new Error(`presentation_authorize_failed:${(await possessionRes.json()).code ?? possessionRes.status}`);
  }
  const action = await walletActionChallenge({
    sessionCookie: sandboxCookie,
    workspaceId: workspace_id,
    keypair,
  });
  const verifyRes = await testVerify({
    cookie: action.cookie,
    workspaceId: workspace_id,
    prepared,
    action_challenge_id: action.action_challenge_id,
    signature: action.signature,
  });
  if (verifyRes.status !== 200) {
    throw new Error(`test_verify_failed:${(await verifyRes.json()).code ?? verifyRes.status}`);
  }
  const verifyBody = await verifyRes.json();
  const receipt = verifyBody.result as PartnerFlowPublicReceipt;
  const independentPayload = await buildSandboxReceiptValidationPayload({
    receipt,
    source: "presented_receipt",
  });
  const validateRes = await validatePresentedReceipt(receipt);
  if (validateRes.status !== 200 || !validateRes.body.signature_authentic) {
    throw new Error("independent_validate_failed");
  }
  return {
    wallet: keypair.publicKey.toBase58(),
    workspace_id,
    presentation_commit_id: prepared.presentation_commit_id,
    action_challenge_id: action.action_challenge_id,
    receipt,
    decision: String(verifyBody.decision ?? ""),
    independent: independentPayload,
  };
}

export async function runBuild762NegativeCases(
  keypair: Keypair = Keypair.generate(),
): Promise<
  Array<{ case_id: string; property: string; expected: string; observed: string; verdict: "pass" | "fail" }>
> {
  applyBuild762TestEnvironment();
  const cases: Array<{
    case_id: string;
    property: string;
    expected: string;
    observed: string;
    verdict: "pass" | "fail";
  }> = [];

  const sessionCookie = await signInWallet(keypair);
  const { workspace_id, cookie: sandboxCookie } = await openWorkspace(sessionCookie);
  const prepared = await preparePresentation(sandboxCookie);

  // Missing presentation authorization before test-verify
  {
    const action = await walletActionChallenge({
      sessionCookie: sandboxCookie,
      workspaceId: workspace_id,
      keypair,
    });
    const res = await testVerify({
      cookie: action.cookie,
      workspaceId: workspace_id,
      prepared,
      action_challenge_id: action.action_challenge_id,
      signature: action.signature,
    });
    const code = (await res.json()).code;
    const ok = res.status === 422 && code === "presentation_possession_not_authorized";
    cases.push({
      case_id: "missing_presentation_authorization",
      property: "Policy execution requires recorded presentation authorization",
      expected: "HTTP 422 presentation_possession_not_authorized",
      observed: `HTTP ${res.status} ${String(code)}`,
      verdict: ok ? "pass" : "fail",
    });
  }

  // Replay presentation commit on second test-verify (before any successful verify consumes commit)
  const preparedReplay = await preparePresentation(sandboxCookie);
  await authorizePresentation({ sessionCookie: sandboxCookie, prepared: preparedReplay });
  {
    const actionA = await walletActionChallenge({
      sessionCookie: sandboxCookie,
      workspaceId: workspace_id,
      keypair,
    });
    const first = await testVerify({
      cookie: actionA.cookie,
      workspaceId: workspace_id,
      prepared: preparedReplay,
      action_challenge_id: actionA.action_challenge_id,
      signature: actionA.signature,
    });
    const actionB = await walletActionChallenge({
      sessionCookie: sandboxCookie,
      workspaceId: workspace_id,
      keypair,
    });
    const second = await testVerify({
      cookie: actionB.cookie,
      workspaceId: workspace_id,
      prepared: preparedReplay,
      action_challenge_id: actionB.action_challenge_id,
      signature: actionB.signature,
    });
    const code = (await second.json()).code;
    const ok = first.status === 200 && second.status === 410 && code === "presentation_commit_not_found";
    cases.push({
      case_id: "replay_presentation_commit",
      property: "Presentation commit consume-once",
      expected: "Second verify HTTP 410 presentation_commit_not_found",
      observed: `first ${first.status} second ${second.status} ${String(code)}`,
      verdict: ok ? "pass" : "fail",
    });

    if (first.status === 200) {
      const verifyBody = await first.json();
      const receipt = { ...verifyBody.result, signature: "invalid" } as PartnerFlowPublicReceipt;
      const tampered = await buildSandboxReceiptValidationPayload({ receipt, source: "presented_receipt" });
      const tamperOk = tampered.signature_authentic === false;
      cases.push({
        case_id: "tampered_receipt_signature",
        property: "Independent verification rejects altered signature",
        expected: "signature_authentic false",
        observed: `signature_authentic ${String(tampered.signature_authentic)}`,
        verdict: tamperOk ? "pass" : "fail",
      });
    } else {
      cases.push({
        case_id: "tampered_receipt_signature",
        property: "Independent verification rejects altered signature",
        expected: "signature_authentic false",
        observed: "skipped: could not obtain signed receipt from happy verify",
        verdict: "fail",
      });
    }
  }

  // Cross-scope wallet action (wrong resource vs policy body)
  const prepared3 = await preparePresentation(sandboxCookie);
  await authorizePresentation({ sessionCookie: sandboxCookie, prepared: prepared3 });
  {
    const action = await walletActionChallenge({
      sessionCookie: sandboxCookie,
      workspaceId: workspace_id,
      keypair,
      policyId: "wallet_control",
      resourceSuffix: `abraxas:sandbox:${workspace_id}:policy:wallet_control`,
    });
    const res = await testVerify({
      cookie: action.cookie,
      workspaceId: workspace_id,
      prepared: prepared3,
      action_challenge_id: action.action_challenge_id,
      signature: action.signature,
      policyId: POLICY_ID,
    });
    const code = (await res.json()).code;
    const ok = res.status === 401 && code === "wrong_resource";
    cases.push({
      case_id: "cross_scope_wallet_action",
      property: "Wallet action binding to resource and policy",
      expected: "HTTP 401 wrong_resource",
      observed: `HTTP ${res.status} ${String(code)}`,
      verdict: ok ? "pass" : "fail",
    });
  }

  // Authorize without session
  const prepared4 = await preparePresentation(sandboxCookie);
  {
    const res = await authorizePresentation({
      sessionCookie: sandboxCookie,
      prepared: prepared4,
      sessionCookieOverride: "",
    });
    const ok = res.status >= 401 && res.status <= 403;
    cases.push({
      case_id: "presentation_authorize_requires_session",
      property: "Presentation authorization requires authenticated session",
      expected: "HTTP 401–403 without session cookie",
      observed: `HTTP ${res.status}`,
      verdict: ok ? "pass" : "fail",
    });
  }

  return cases;
}

export { EPHEMERAL_SANDBOX_TEST_PARTNER_ID, POLICY_ID, ORIGIN };
