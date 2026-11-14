// FILE: app/api/developers/verification-first/verify-bundle/route.ts
// Optional hosted helper — partners should verify with @abraxas/independent-verifier offline.

import { NextResponse } from "next/server";
import type { PortableVerificationBundle } from "@/lib/partner/portableIndependentVerification/buildPortableVerificationBundle";
import { verifyPortableBundle } from "@/lib/partner/portableIndependentVerification";
import {
  plainAcceptabilityLine,
  plainIssuerLine,
  plainVerificationVerdict,
  plainWhatItProves,
} from "@/lib/partner/portableIndependentVerification/plainVerificationSummary";

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
  const verification = verifyPortableBundle({
    bundle,
    integratorPinnedTrustAnchor: anchor,
    partnerId: record.partner_id,
    policyId: record.policy_id,
  });
  const verdict = plainVerificationVerdict(verification);
  return NextResponse.json({
    ok: true,
    verdict,
    plain: {
      what_it_proves: plainWhatItProves({
        policyId: record.policy_id,
        partnerId: record.partner_id,
        decision: record.decision_result,
      }),
      issuer: plainIssuerLine(verification),
      acceptable: plainAcceptabilityLine(verification),
      next_action:
        verdict === "Valid"
          ? "If this matches your policy, you may permit the action. Refresh signed status when your rules require live validity."
          : "Do not permit the action. Request a fresh bundle or updated signed status from the issuer.",
    },
    verification,
  });
}