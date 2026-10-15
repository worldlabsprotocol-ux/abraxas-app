// FILE: app/api/passport/reusable-credentials/status/route.ts

import { NextRequest, NextResponse } from "next/server";
import { portableTrustCsrfRejected } from "@/lib/passport/portableTrust/csrf";
import { resolveAuthenticatedHolderSession } from "@/lib/passport/portableTrust/resolveHolderSession";
import { loadHolderIdentitySurfaceForSession } from "@/lib/persistence/holderIdentitySurfaceDirect";
import { loadReusableCredentialLifecycleForHolderDirect } from "@/lib/persistence/passportReusableCredentialLifecycleDirect";
import { tryBackfillPassportReusableCredentialForSubjectDirect } from "@/lib/persistence/passportReusableCredentialDirectStore";

export async function GET(req: NextRequest) {
  const session = await resolveAuthenticatedHolderSession(req);
  if (!session.ok) {
    return NextResponse.json(
      { error: session.message },
      { status: session.error === "forbidden" ? 403 : 401 },
    );
  }

  const [lifecycle, holder_identity] = await Promise.all([
    loadReusableCredentialLifecycleForHolderDirect(session.subjectId),
    loadHolderIdentitySurfaceForSession(session.session),
  ]);
  return NextResponse.json({ build: 579, lifecycle, holder_identity });
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

  let body: { action?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (body.action !== "retry_issuance_backfill") {
    return NextResponse.json({ error: "unsupported_action" }, { status: 400 });
  }

  const backfill = await tryBackfillPassportReusableCredentialForSubjectDirect({
    subjectKey: session.subjectId,
    eventSource: "passport_lifecycle_recovery",
  });

  const [lifecycle, holder_identity] = await Promise.all([
    loadReusableCredentialLifecycleForHolderDirect(session.subjectId),
    loadHolderIdentitySurfaceForSession(session.session),
  ]);
  if (!backfill.ok) {
    return NextResponse.json(
      { build: 579, lifecycle, holder_identity, backfill: { ok: false, code: backfill.code } },
      { status: 409 },
    );
  }
  return NextResponse.json({
    build: 579,
    lifecycle,
    holder_identity,
    backfill: { ok: true, credential_id: backfill.credentialId },
  });
}
