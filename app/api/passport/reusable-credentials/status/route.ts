// FILE: app/api/passport/reusable-credentials/status/route.ts

import { NextRequest, NextResponse } from "next/server";
import { resolveAuthenticatedHolderSession } from "@/lib/passport/portableTrust/resolveHolderSession";
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

  const lifecycle = await loadReusableCredentialLifecycleForHolderDirect(session.subjectId);
  return NextResponse.json({ build: 568, lifecycle });
}

export async function POST(req: NextRequest) {
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

  const lifecycle = await loadReusableCredentialLifecycleForHolderDirect(session.subjectId);
  if (!backfill.ok) {
    return NextResponse.json(
      { build: 568, lifecycle, backfill: { ok: false, code: backfill.code } },
      { status: 409 },
    );
  }
  return NextResponse.json({
    build: 568,
    lifecycle,
    backfill: { ok: true, credential_id: backfill.credentialId },
  });
}
