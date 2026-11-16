// FILE: app/api/developers/verification-first/verify-bundle/route.ts
// Optional hosted helper — not a substitute for offline independent verification.

import { NextResponse } from "next/server";
import type { PortableVerificationBundle } from "@/lib/partner/portableIndependentVerification/buildPortableVerificationBundle";
import { verifyPortableBundle } from "@/lib/partner/portableIndependentVerification";
import { buildDefaultResultRows } from "@/lib/partner/portableIndependentVerification/plainVerificationSummary";
import { verificationFirstHostedLearningVerifyInputs } from "@/lib/partner/portableIndependentVerification/integrationFirstDemonstration";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }
  const bundle = (body as { bundle?: PortableVerificationBundle }).bundle;
  if (!bundle?.schema?.startsWith("abraxas_portable_verification_bundle")) {
    return NextResponse.json({ ok: false, error: "invalid_portable_bundle" }, { status: 400 });
  }
  const anchor = bundle.bundled_trust_anchor ?? bundle.pinned_trust_anchor;
  if (!anchor) {
    return NextResponse.json({ ok: false, error: "missing_trust_anchor" }, { status: 400 });
  }
  const record = bundle.decision_receipt;
  const hostedLearning = verificationFirstHostedLearningVerifyInputs(bundle);
  const verification = verifyPortableBundle({
    bundle,
    integratorPinnedTrustAnchor: anchor,
    partnerId: record.partner_id,
    policyId: record.policy_id,
    ...hostedLearning,
  });
  const plain = buildDefaultResultRows({
    verification,
    mode: "hosted_pasted_bundle",
    policy_id: record.policy_id,
    partner_id: record.partner_id,
    receipt_id: record.id,
    isSyntheticDemo: record.decision_context !== "production",
    decisionResult: record.decision_result,
  });
  return NextResponse.json({
    ok: true,
    plain,
    verification,
    offline_verification_note:
      "Production integrators pin trust material out-of-band and verify with @abraxas/independent-verifier — they do not rely on this hosted API.",
  });
}