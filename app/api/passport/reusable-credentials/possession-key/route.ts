// FILE: app/api/passport/reusable-credentials/possession-key/route.ts

import { NextRequest, NextResponse } from "next/server";
import { portableTrustCsrfRejected } from "@/lib/passport/portableTrust/csrf";
import { resolveAuthenticatedHolderSession } from "@/lib/passport/portableTrust/resolveHolderSession";
import {
  registerPassportHolderPossessionKeyDirect,
  tryBackfillPassportReusableCredentialForSubjectDirect,
} from "@/lib/persistence/passportReusableCredentialDirectStore";
import { isPassportReusableCredentialStorageEnabled } from "@/lib/passport/reusableCredential/storageGate";

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
  if (!isPassportReusableCredentialStorageEnabled()) {
    return NextResponse.json({ error: "reusable_credential_storage_disabled" }, { status: 403 });
  }

  let body: {
    public_key_b64url?: string;
    rotation?: { authorized?: boolean; previous_public_key_b64url?: string };
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const registered = await registerPassportHolderPossessionKeyDirect({
    holderSubjectId: session.subjectId,
    publicKeyB64Url: body.public_key_b64url ?? "",
    rotation:
      body.rotation?.authorized === true && body.rotation.previous_public_key_b64url
        ? { authorized: true, previous_public_key_b64url: body.rotation.previous_public_key_b64url }
        : undefined,
  });

  if (!registered.ok) {
    const status =
      registered.code === "possession_key_rotation_required" ? 409
      : registered.code === "invalid_public_key" ? 400
      : 403;
    return NextResponse.json({ error: registered.code }, { status });
  }

  const backfill = await tryBackfillPassportReusableCredentialForSubjectDirect({
    subjectKey: session.subjectId,
    eventSource: "passport_possession_key_register",
  });

  return NextResponse.json({
    registered: true,
    rotated: registered.rotated,
    issuance: backfill.ok
      ? { credential_id: backfill.credentialId }
      : { deferred: true, code: backfill.code },
  });
}
