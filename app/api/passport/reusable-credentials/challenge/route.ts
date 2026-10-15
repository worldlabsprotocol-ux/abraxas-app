// FILE: app/api/passport/reusable-credentials/challenge/route.ts

import { NextRequest, NextResponse } from "next/server";
import { portableTrustCsrfRejected } from "@/lib/passport/portableTrust/csrf";
import { resolveAuthenticatedHolderSession } from "@/lib/passport/portableTrust/resolveHolderSession";
import {
  build566SyntheticReusableCredential,
  isPassportReusableCredentialDemoAllowed,
} from "@/lib/passport/reusableCredential";
import { issuePassportPossessionChallenge } from "@/lib/passport/reusableCredential/holderPossessionChallenge";
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
    return NextResponse.json({ error: "reusable_credential_challenge_disabled_in_production" }, { status: 403 });
  }

  let body: { partner_id?: string; policy_id?: string; credential_id?: string };
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

  const challenge = issuePassportPossessionChallenge({
    credentialId: credential.payload.credential_id,
    partnerId: body.partner_id,
    policyId: body.policy_id,
    now: BUILD_546_FIXTURE_NOW,
  });

  return NextResponse.json({
    synthetic_demo: true,
    sandbox_only: true,
    credential_id: credential.payload.credential_id,
    challenge,
    note: "Sign this challenge with the credential holder possession key before calling present.",
  });
}
