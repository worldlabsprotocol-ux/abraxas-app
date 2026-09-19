// FILE: app/api/judge-demo/environment/route.ts
// Public DEMO environment identity. Project refs and runtime markers only — never secrets.

import { NextRequest, NextResponse } from "next/server";
import {
  evaluateJudgeDemoContract,
  isJudgeDemoRequested,
  judgeDemoIdentityHasForbiddenMaterial,
  toPublicJudgeDemoIdentity,
} from "@/lib/judgeDemo/contract";
import { isPublicProductProduction, isPublicProductRequestHost } from "@/lib/product/publicOrigin";

export const dynamic = "force-dynamic";

const UNAVAILABLE = NextResponse.json(
  { error: "judge_demo_unavailable", code: "judge_demo_not_enabled" },
  { status: 404, headers: { "Cache-Control": "no-store" } },
);

export async function GET(req: NextRequest) {
  if (!isJudgeDemoRequested() || isPublicProductProduction() || isPublicProductRequestHost(req)) {
    return UNAVAILABLE;
  }

  const evaluation = evaluateJudgeDemoContract({ request: req });
  const body = toPublicJudgeDemoIdentity(evaluation);
  if (judgeDemoIdentityHasForbiddenMaterial(body)) {
    return NextResponse.json(
      { error: "judge_demo_identity_redacted", code: "judge_demo_identity_forbidden" },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
  return NextResponse.json(body, {
    status: evaluation.ok ? 200 : 503,
    headers: { "Cache-Control": "no-store" },
  });
}
