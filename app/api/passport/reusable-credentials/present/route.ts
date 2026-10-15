// FILE: app/api/passport/reusable-credentials/present/route.ts

import { NextRequest, NextResponse } from "next/server";
import { InMemoryPortableRevocationCheckpointStore } from "@/lib/protocol/portableRevocation";
import { bootstrapTrustFromArtifact } from "@/lib/protocol/portableRevocation";
import { buildSyntheticPortableRevocationSnapshot } from "@/lib/protocol/portableRevocation";
import { portableTrustCsrfRejected } from "@/lib/passport/portableTrust/csrf";
import { resolveAuthenticatedHolderSession } from "@/lib/passport/portableTrust/resolveHolderSession";
import {
  consumePassportPossessionChallengeDirect,
} from "@/lib/persistence/postgresPassportPossessionChallengeStore";
import {
  BUILD_566_POLICY_RULES,
  authorizePartnerFromReusableCredential,
  build566RevocationSnapshotForCredential,
  build566SyntheticReusableCredential,
  build566TrustEnv,
  buildPresentationRequestDisclosure,
  isPassportReusableCredentialDemoAllowed,
} from "@/lib/passport/reusableCredential";
import type {
  HolderPossessionProof,
  PassportPossessionChallengePayload,
} from "@/lib/passport/reusableCredential/holderPossessionChallenge";
import {
  InMemoryPassportPossessionChallengeStore,
} from "@/lib/passport/reusableCredential/holderPossessionChallenge";
import { BUILD_566_RECEIPT_SIGNING_KEY } from "@/lib/passport/reusableCredential/fixtures";
import { BUILD_546_FIXTURE_NOW } from "@/lib/institutionalCertification/build546/fixtures";
import { resolveHolderReusableCredential } from "@/lib/passport/reusableCredential/resolveStoredCredential";
import { isPassportReusableCredentialStorageEnabled } from "@/lib/passport/reusableCredential/storageGate";
import { loadReceiptSigningKey } from "@/lib/decisionReceipts/signing";

function revocationSnapshotForCredential(credentialId: string) {
  return buildSyntheticPortableRevocationSnapshot({
    receiptId: credentialId,
    state: "active",
  });
}

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
  if (!body.challenge || !body.holder_possession_proof) {
    return NextResponse.json(
      {
        error: "holder_possession_proof_required",
        note: "Obtain an RP challenge, sign it with the credential holder possession key, then submit challenge and proof together.",
      },
      { status: 400 },
    );
  }

  const storageEnabled = isPassportReusableCredentialStorageEnabled();
  if (storageEnabled) {
    const credential = await resolveHolderReusableCredential({
      holderSubjectId: session.subjectId,
      credentialId: body.credential_id,
    });
    if (credential) {
      const challengeStore = new InMemoryPassportPossessionChallengeStore();
      const receiptKey = loadReceiptSigningKey() ?? BUILD_566_RECEIPT_SIGNING_KEY;
      const env = { ...process.env, ...build566TrustEnv() } as Record<string, string | undefined>;
      const revocation = revocationSnapshotForCredential(credential.payload.credential_id);
      const requestId = body.request_id ?? `req_present_${Date.now()}`;
      const policyRules =
        credential.payload.provenance.idv_method === "sandbox_fixture"
          ? BUILD_566_POLICY_RULES
          : { ...BUILD_566_POLICY_RULES, sandbox_only: false };

      const authorized = await authorizePartnerFromReusableCredential({
        credential,
        partnerId: body.partner_id,
        policyId: body.policy_id,
        policyVersion: 1,
        policyRules,
        requestId,
        receiptSigningKey: receiptKey,
        portableRevocationSnapshot: revocation,
        possessionChallenge: body.challenge,
        holderPossessionProof: body.holder_possession_proof,
        checkpointStore: new InMemoryPortableRevocationCheckpointStore(),
        bootstrapTrusts: [bootstrapTrustFromArtifact({ artifact: revocation })],
        env,
        challengeStore,
        durablePossessionConsume: async (challengeId, at) =>
          consumePassportPossessionChallengeDirect({
            challengeId,
            credentialId: credential.payload.credential_id,
            partnerId: body.partner_id!,
            policyId: body.policy_id!,
            at,
          }),
      });

      if (!authorized.ok) {
        return NextResponse.json({ error: authorized.code, issuer_backed: true }, { status: 400 });
      }

      const disclosure = buildPresentationRequestDisclosure({
        credentialId: credential.payload.credential_id,
        partnerId: body.partner_id,
        partnerLabel: body.partner_id,
        policyId: body.policy_id,
        requestedAttribute: "product_eligibility (authenticated issuer outcome)",
      });

      return NextResponse.json({
        issuer_backed: true,
        synthetic_demo: credential.payload.provenance.idv_method === "sandbox_fixture",
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
  }

  if (!isPassportReusableCredentialDemoAllowed()) {
    return NextResponse.json({ error: "reusable_credential_present_disabled_in_production" }, { status: 403 });
  }

  const credential = build566SyntheticReusableCredential({
    holderSubjectId: session.subjectId,
    credentialId: body.credential_id ?? `pc_present_${session.subjectId.slice(-8)}`,
  });
  const revocation = build566RevocationSnapshotForCredential(credential.payload.credential_id);
  const requestId = body.request_id ?? `req_present_${Date.now()}`;
  const env = { ...process.env, ...build566TrustEnv() } as Record<string, string | undefined>;

  const authorized = await authorizePartnerFromReusableCredential({
    credential,
    partnerId: body.partner_id,
    policyId: body.policy_id,
    policyVersion: 1,
    policyRules: BUILD_566_POLICY_RULES,
    requestId,
    receiptSigningKey: BUILD_566_RECEIPT_SIGNING_KEY,
    portableRevocationSnapshot: revocation,
    possessionChallenge: body.challenge,
    holderPossessionProof: body.holder_possession_proof,
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
    idv_repeated: false,
    disclosure,
    partner_authorization: {
      receipt_id: authorized.receipt.id,
      partner_id: authorized.receipt.partner_id,
      policy_id: authorized.receipt.policy_id,
      decision_context: authorized.decision_context,
      not_a_partner_receipt: true,
    },
    presentation: authorized.presentation,
  });
}
