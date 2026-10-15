// FILE: app/api/passport/reusable-credentials/export/route.ts

import { NextRequest, NextResponse } from "next/server";
import { portableTrustCsrfRejected } from "@/lib/passport/portableTrust/csrf";
import { resolveAuthenticatedHolderSession } from "@/lib/passport/portableTrust/resolveHolderSession";
import {
  build566SyntheticReusableCredential,
  isPassportReusableCredentialDemoAllowed,
} from "@/lib/passport/reusableCredential";

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
    return NextResponse.json(
      { error: "reusable_credential_export_disabled_in_production" },
      { status: 403 },
    );
  }
  let body: { credential_id?: string };
  try {
    body = (await req.json()) as { credential_id?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const credential = build566SyntheticReusableCredential({
    holderSubjectId: session.subjectId,
    credentialId: body.credential_id ?? `pc_export_${session.subjectId.slice(-8)}`,
  });
  return NextResponse.json({
    synthetic_demo: true,
    not_account_recovery: true,
    credential,
    custody_note: "Credential export is not Passport account recovery and does not include identity documents.",
  });
}
