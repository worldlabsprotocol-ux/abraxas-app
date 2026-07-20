// FILE: app/api/verify/e2e/route.ts
// Honest end-to-end verification check — verify → proof → independent validation.

import { NextResponse } from "next/server";
import { runE2eVerificationCheck } from "@/lib/authenticationProof/runE2eVerificationCheck";
import { getAgentVerificationGuide } from "@/lib/agentVerification";

export const dynamic = "force-dynamic";

export async function GET() {
  const [check, agentGuide] = await Promise.all([
    runE2eVerificationCheck(),
    Promise.resolve(getAgentVerificationGuide()),
  ]);

  return NextResponse.json({
    ...check,
    agent_guide_url: agentGuide.endpoints.verify.path,
    docs: {
      agents: agentGuide.docs_page,
      relying_party: agentGuide.relying_party_docs,
    },
  });
}
