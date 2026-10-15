// FILE: app/api/passport/portable-trust/independent-verify/route.ts
// Demonstration-only independent RP path (synthetic registry env).

import { NextRequest, NextResponse } from "next/server";
import { parseHolderPortableImport } from "@/lib/passport/portableTrust";
import { verifyHolderPresentationIndependently } from "@/lib/passport/portableTrust/independentVerification";
import { isSyntheticIndependentVerifyAllowed } from "@/lib/passport/portableTrust/syntheticVerifyGate";
import type { PortableRevocationSignedArtifact } from "@/lib/protocol/portableRevocation";
import { build546TrustRegistryEnv } from "@/lib/institutionalCertification/build546/fixtures";

export async function POST(req: NextRequest) {
  if (!isSyntheticIndependentVerifyAllowed()) {
    return NextResponse.json(
      {
        outcome: "blocked",
        code: "synthetic_verification_disabled_in_production",
        environment: "production",
        note: "Synthetic trust registry and revocation fixtures are not live institutional authorization.",
      },
      { status: 403 },
    );
  }

  let body: {
    bundle?: unknown;
    portable_revocation_snapshot?: PortableRevocationSignedArtifact;
    request_id?: string;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = parseHolderPortableImport(body.bundle);
  if (!parsed.ok) {
    return NextResponse.json({ outcome: "blocked", code: parsed.code }, { status: 400 });
  }
  const presentation = parsed.bundle.presentation;
  const portableRevocationSnapshot =
    body.portable_revocation_snapshot
    ?? (await import("@/lib/protocol/proofFirst/proofFirstTestRevocation")).activePortableRevocationSnapshotForReceipt(
      presentation.signed_decision_receipt.id,
    );
  const env = build546TrustRegistryEnv();
  const decision = await verifyHolderPresentationIndependently({
    presentation,
    portableRevocationSnapshot,
    partnerId: presentation.audience_partner_id,
    policyId: presentation.policy_id,
    env,
    requestId: body.request_id ?? `req_565_demo_${Date.now()}`,
  });
  return NextResponse.json({
    synthetic_demo: true,
    not_live_institutional_authorization: true,
    outcome: decision.outcome,
    abraxas_infrastructure_required: decision.abraxas_infrastructure_required,
    identity_database_required: decision.identity_database_required,
    portable_revocation_authenticated: decision.portable_revocation_authenticated,
    failure_codes: decision.verifier.failure_codes,
  });
}
