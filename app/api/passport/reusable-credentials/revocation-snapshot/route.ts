// FILE: app/api/passport/reusable-credentials/revocation-snapshot/route.ts
// Issuer-backed presentation helper: fail closed unless publisher URL is configured.

import { NextRequest, NextResponse } from "next/server";
import { resolveAuthenticatedHolderSession } from "@/lib/passport/portableTrust/resolveHolderSession";
import { resolveHolderReusableCredential } from "@/lib/passport/reusableCredential/resolveStoredCredential";
import { isPassportReusableCredentialStorageEnabled } from "@/lib/passport/reusableCredential/storageGate";
import { build566RevocationSnapshotForCredential } from "@/lib/passport/reusableCredential/fixtures";

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

  if (credential.payload.provenance.idv_method === "sandbox_fixture") {
    return NextResponse.json({
      snapshot: build566RevocationSnapshotForCredential(credential.payload.credential_id),
      sandbox_fixture: true,
    });
  }

  const publisherUrl = process.env.ABRAXAS_PORTABLE_REVOCATION_PUBLISHER_URL?.trim();
  if (!publisherUrl) {
    return NextResponse.json(
      {
        error: "portable_revocation_publisher_unconfigured",
        note: "Issuer-backed presentation requires an authenticated portable revocation snapshot from your configured publisher.",
      },
      { status: 503 },
    );
  }

  const statusId = credential.payload.revocation_status_id;
  const url = `${publisherUrl.replace(/\/$/, "")}/status/${encodeURIComponent(statusId)}`;
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      return NextResponse.json({ error: "publisher_fetch_failed", status: res.status }, { status: 502 });
    }
    const snapshot = await res.json();
    return NextResponse.json({ snapshot, publisher_url: publisherUrl, server_fetched: true });
  } catch {
    return NextResponse.json({ error: "publisher_unreachable" }, { status: 502 });
  }
}
