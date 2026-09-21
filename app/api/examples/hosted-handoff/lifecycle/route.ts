// FILE: app/api/examples/hosted-handoff/lifecycle/route.ts
// Public sandbox fixture documentation endpoint. No live holder.

import { NextResponse } from "next/server";
import { hostedHandoffHttpExamples } from "@/lib/partner/hostedHandoff";
import { HOSTED_HANDOFF_NOTICE, HOSTED_HANDOFF_DOCS } from "@/lib/partner/hostedHandoff/contract";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    notice: HOSTED_HANDOFF_NOTICE,
    docs: HOSTED_HANDOFF_DOCS,
    examples: hostedHandoffHttpExamples(),
    activates_production: false,
    is_grant: false,
  });
}
