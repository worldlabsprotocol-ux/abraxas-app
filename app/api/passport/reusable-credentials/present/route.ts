// FILE: app/api/passport/reusable-credentials/present/route.ts

import { NextRequest, NextResponse } from "next/server";
import { InMemoryPortableRevocationCheckpointStore } from "@/lib/protocol/portableRevocation";
import { bootstrapTrustFromArtifact } from "@/lib/protocol/portableRevocation";
import { portableTrustCsrfRejected } from "@/lib/passport/portableTrust/csrf";
import { resolveAuthenticatedHolderSession } from "@/lib/passport/portableTrust/resolveHolderSession";
import {
  BUILD_566_POLICY_RULES,
  authorizePartnerFromReusableCredential,
  build566RevocationSnapshotForCredential,
  build566SyntheticReusableCredential,
  build566TrustEnv,
  buildPresentationRequestDisclosure,
  isPassportReusableCredentialDemoAllowed,
} from "@/lib/passport/reusableCredential";
import {
  issuePassportPossessionChallenge,
  signPassportPossessionChallenge,
  type HolderPossessionProof,
  type PassportPossessionChallengePayload,
} from "@/lib/passport/reusableCredential/holderPossessionChallenge";
import {
  BUILD_566_HOLDER_POSSESSION_KEYPAIR,
  BUILD_566_RECEIPT_SIGNING_KEY,
} from "@/lib/passport/reusableCredential/fixtures";
import { BUILD_546_FIXTURE_NOW } from "@/lib/institutionalCertification/build546/fixtures";

export async function POST(req: NextRequest) {
  const csrf = portableTrustCsrfRejected(req);
  if (csrf) {
    return NextResponse.json({ error: csrf }, { status: 403 });
  }
  const session = await resolveAuthenticatedHolderSession(req);
  if (!session.ok) {
    return NextResponse.json(
      { error: session.message },
      { status: session.error === "forbidden" ? 403 : 401 },
    );
  }
  if (!isPassportReusableCredentialDemoAllowed()) {
    return NextResponse.json({ error: "reusable_credential_present_disabled_in_production" }, { status: 403 });
  }

  let body: {
    partner_id?: string;
    policy_id?: string;
    request_id?: string;
    credential_id?: string;
    challenge?: PassportPossessionChallengePayload;
    holder_possession_proof?: HolderPossessionProof;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.partner_id || !body.policy_id) {
    return NextResponse.json({ error: "partner_id and policy_id required" }, { status: 400 });
  }

  const credential = build566SyntheticReusableCredential({
    holderSubjectId: session.subjectId,
    credentialId: body.credential_id ?? `pc_present_${session.subjectId.slice(-8)}`,
  });
  const revocation = build566RevocationSnapshotForCredential(credential.payload.credential_id);
  const requestId = body.request_id ?? `req_present_${Date.now()}`;
  const env = { ...process.env, ...build566TrustEnv() } as Record<string, string | undefined>;

  let challenge = body.challenge;
  let proof = body.holder_possession_proof;
  let serverSignedPossession = false;
  if (!challenge || !proof) {
    const issued = issuePassportPossessionChallenge({
      credentialId: credential.payload.credential_id,
      partnerId: body.partner_id,
      policyId: body.policy_id,
      now: BUILD_546_FIXTURE_NOW,
    });
    challenge = issued;
    proof = {
      challenge_id: issued.challenge_id,
      signature: signPassportPossessionChallenge(issued, BUILD_566_HOLDER_POSSESSION_KEYPAIR.secretKey),
    };
    serverSignedPossession = true;
  }

  const authorized = await authorizePartnerFromReusableCredential({
    credential,
    partnerId: body.partner_id,
    policyId: body.policy_id,
    policyVersion: 1,
    policyRules: BUILD_566_POLICY_RULES,
    requestId,
    receiptSigningKey: BUILD_566_RECEIPT_SIGNING_KEY,
    portableRevocationSnapshot: revocation,
    possessionChallenge: challenge,
    holderPossessionProof: proof,
    checkpointStore: new InMemoryPortableRevocationCheckpointStore(),
    bootstrapTrusts: [bootstrapTrustFromArtifact({ artifact: revocation })],
    now: BUILD_546_FIXTURE_NOW,
    env,
  });

  if (!authorized.ok) {
    return NextResponse.json({ error: authorized.code, sandbox_only: true }, { status: 400 });
  }

  const disclosure = buildPresentationRequestDisclosure({
    credentialId: credential.payload.credential_id,
    partnerId: body.partner_id,
    partnerLabel: body.partner_id,
    policyId: body.policy_id,
    requestedAttribute: "product_eligibility (authenticated issuer outcome)",
  });

  return NextResponse.json({
    synthetic_demo: true,
    sandbox_only: true,
    server_signed_possession_demo: serverSignedPossession,
    idv_repeated: false,
    disclosure,
    partner_authorization: {
      receipt_id: authorized.receipt.id,
      partner_id: authorized.receipt.partner_id,
      policy_id: authorized.receipt.policy_id,
      decision_context: authorized.decision_context,
      not_a_reusable_credential: true,
    },
    presentation: authorized.presentation,
  });
}
