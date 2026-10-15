// FILE: app/api/passport/reusable-credentials/revocation-snapshot/route.ts
// Issuer-backed presentation helper: fail closed unless publisher URL is configured.

import { NextRequest, NextResponse } from "next/server";
import { resolveAuthenticatedHolderSession } from "@/lib/passport/portableTrust/resolveHolderSession";
import { resolveHolderReusableCredential } from "@/lib/passport/reusableCredential/resolveStoredCredential";
import { isPassportReusableCredentialStorageEnabled } from "@/lib/passport/reusableCredential/storageGate";
import { fetchPortableRevocationSnapshotForCredential } from "@/lib/passport/reusableCredential/serverPortableRevocationSnapshot";

export async function GET(req: NextRequest) {
  const session = await resolveAuthenticatedHolderSession(req);
  if (!session.ok) {
    return NextResponse.json(
      { error: session.message },
      { status: session.error === "forbidden" ? 403 : 401 },
    );
  }
  if (!isPassportReusableCredentialStorageEnabled()) {
    return NextResponse.json({ error: "storage_disabled" }, { status: 403 });
  }

  const credentialId = req.nextUrl.searchParams.get("credential_id")?.trim();
  if (!credentialId) {
    return NextResponse.json({ error: "credential_id_required" }, { status: 400 });
  }

  const credential = await resolveHolderReusableCredential({
    holderSubjectId: session.subjectId,
    credentialId,
  });
  if (!credential) {
    return NextResponse.json({ error: "credential_not_found" }, { status: 404 });
  }

  const fetched = await fetchPortableRevocationSnapshotForCredential({ credential });
  if (!fetched.ok) {
    return NextResponse.json(
      { error: fetched.code, note: fetched.note },
      { status: fetched.httpStatus },
    );
  }
  return NextResponse.json({
    snapshot: fetched.snapshot,
    sandbox_fixture: fetched.sandbox_fixture,
    server_fetched: fetched.server_fetched,
  });
}
