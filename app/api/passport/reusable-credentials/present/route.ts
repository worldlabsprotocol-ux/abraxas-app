// FILE: app/api/passport/reusable-credentials/present/route.ts

import { NextRequest, NextResponse } from "next/server";
import { InMemoryPortableRevocationCheckpointStore, bootstrapTrustFromArtifact } from "@/lib/protocol/portableRevocation";
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
import { authorizeIssuerBackedPresentation } from "@/lib/passport/reusableCredential/issuerBackedPresentationOrchestration";
import { resolvePresentationPartnerPolicy } from "@/lib/passport/reusableCredential/institutionalPresentationPolicy";
import { requireIssuerBackedReceiptSigningKey } from "@/lib/passport/reusableCredential/issuerBackedReceiptSigning";
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
    consent_id?: string;
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
      const policyEarly = await resolvePresentationPartnerPolicy({
        partnerId: body.partner_id,
        policyId: body.policy_id,
        credential,
      });
      if (!policyEarly.ok) {
        return NextResponse.json({ error: policyEarly.code, issuer_backed: true }, { status: 403 });
      }

      if (
        body.challenge.credential_id !== credential.payload.credential_id
        || body.challenge.partner_id !== body.partner_id
        || body.challenge.policy_id !== body.policy_id
      ) {
        return NextResponse.json({ error: "challenge_binding_mismatch", issuer_backed: true }, { status: 400 });
      }

      if (!body.consent_id) {
        return NextResponse.json(
          {
            error: "institutional_consent_required",
            note: "Record authenticated holder consent before presentation.",
          },
          { status: 400 },
        );
      }

      const receiptKey = requireIssuerBackedReceiptSigningKey();
      if (!receiptKey.ok) {
        return NextResponse.json(
          { error: receiptKey.code, issuer_backed: true },
          { status: 503 },
        );
      }
      const requestId = body.request_id?.trim() || `req_present_${Date.now()}`;

      const result = await authorizeIssuerBackedPresentation({
        credential,
        holderSubjectId: session.subjectId,
        partnerId: body.partner_id,
        policyId: body.policy_id,
        consentId: body.consent_id,
        requestId,
        challenge: body.challenge,
        holderPossessionProof: body.holder_possession_proof,
        receiptSigningKey: receiptKey.key,
      });

      if (!result.ok) {
        const pending =
          result.code === "authorization_outcome_pending"
          || result.code === "authorization_signing_deferred";
        return NextResponse.json(
          {
            error: result.code,
            issuer_backed: true,
            authorization_pending: pending,
            note: "note" in result ? result.note : undefined,
          },
          { status: result.httpStatus },
        );
      }

      return NextResponse.json({
        issuer_backed: true,
        synthetic_demo: credential.payload.provenance.idv_method === "sandbox_fixture",
        idv_repeated: false,
        idempotent_recovery: "idempotent_recovery" in result ? result.idempotent_recovery : false,
        disclosure: result.disclosure,
        partner_authorization: {
          receipt_id: result.authorized.receipt.id,
          partner_id: result.authorized.receipt.partner_id,
          policy_id: result.authorized.receipt.policy_id,
          consent_receipt_id: result.authorized.receipt.consent_receipt_id,
          decision_context: result.authorized.decision_context,
          not_a_reusable_credential: true,
        },
        presentation: result.authorized.presentation,
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
