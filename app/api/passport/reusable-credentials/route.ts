// FILE: app/api/passport/reusable-credentials/route.ts

import { NextRequest, NextResponse } from "next/server";
import { resolveAuthenticatedHolderSession } from "@/lib/passport/portableTrust/resolveHolderSession";
import {
  build566SyntheticReusableCredential,
  isPassportReusableCredentialDemoAllowed,
  summarizeReusableCredential,
} from "@/lib/passport/reusableCredential";
import { listIssuerBackedReusableCredentials } from "@/lib/passport/reusableCredential/resolveStoredCredential";
import { isPassportReusableCredentialStorageEnabled } from "@/lib/passport/reusableCredential/storageGate";

export async function GET(req: NextRequest) {
  const session = await resolveAuthenticatedHolderSession(req);
  if (!session.ok) {
    return NextResponse.json(
      { error: session.message },
      { status: session.error === "forbidden" ? 403 : 401 },
    );
  }

  const storageEnabled = isPassportReusableCredentialStorageEnabled();
  if (storageEnabled) {
    const stored = await listIssuerBackedReusableCredentials(session.subjectId);
    if (stored.length) {
      return NextResponse.json({
        build: 567,
        sandbox_only: process.env.NODE_ENV !== "production",
        issuer_backed: true,
        credentials: stored.map((cred) =>
          summarizeReusableCredential(cred, { sandboxLabeled: cred.payload.provenance.idv_method === "sandbox_fixture" }),
        ),
      });
    }
  }

  if (!isPassportReusableCredentialDemoAllowed()) {
    return NextResponse.json({
      credentials: [],
      build: 567,
      sandbox_only: true,
      note: "Reusable Passport credentials are not listed in production until issuer-backed storage is enabled for this environment.",
    });
  }
  const synthetic = build566SyntheticReusableCredential({
    holderSubjectId: session.subjectId,
    credentialId: `pc_demo_${session.subjectId.slice(-8)}`,
  });
  return NextResponse.json({
    build: 566,
    sandbox_only: true,
    synthetic_demo: true,
    credentials: [summarizeReusableCredential(synthetic, { sandboxLabeled: true })],
  });
}
