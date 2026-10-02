import { NextRequest, NextResponse } from "next/server";
import { requireBrowserSession } from "@/lib/auth/browserSession";
import { submitProvenanceDisclosure } from "@/lib/provenance/submitProvenanceDisclosure";
import type { AiAssistanceCategory } from "@/lib/provenance/types";

export const dynamic = "force-dynamic";

const AI_CATEGORIES = new Set<AiAssistanceCategory>([
  "none_declared",
  "editing_assistance",
  "generative_assistance",
  "substantially_generated",
]);

export async function POST(request: NextRequest) {
  const session = await requireBrowserSession(request);
  if (!session.ok) {
    return NextResponse.json({ error: session.error }, { status: session.status });
  }

  let body: {
    partner_id?: string;
    policy_id?: string;
    content_hash?: string;
    content_type?: string;
    byte_length?: number;
    creator_attested?: boolean;
    ai_category?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const partnerId = body.partner_id?.trim();
  const policyId = body.policy_id?.trim();
  const contentHash = body.content_hash?.trim().toLowerCase();
  const contentType = body.content_type?.trim() || "application/octet-stream";
  const byteLength = Number(body.byte_length ?? 0);
  const aiCategory = body.ai_category?.trim() as AiAssistanceCategory | undefined;

  if (!partnerId || !policyId || !contentHash || !aiCategory) {
    return NextResponse.json(
      { error: "partner_id, policy_id, content_hash, and ai_category are required" },
      { status: 400 },
    );
  }

  if (!AI_CATEGORIES.has(aiCategory)) {
    return NextResponse.json({ error: "invalid_ai_category" }, { status: 400 });
  }

  const result = await submitProvenanceDisclosure({
    subjectId: session.session.suiAddress,
    partnerId,
    policyId,
    contentHash,
    contentType,
    byteLength,
    creatorAttested: body.creator_attested === true,
    aiCategory,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.code }, { status: result.status });
  }

  return NextResponse.json({
    ok: true,
    artifact_id: result.artifact_id,
    content_hash: result.content_hash,
  });
}
