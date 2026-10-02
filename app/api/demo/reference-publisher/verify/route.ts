import { NextRequest, NextResponse } from "next/server";
import { verifyReferencePublisherCallback } from "@/lib/demo/referenceContentPublisher/verifyCallback";
import { loadReferencePublisherDraft } from "@/lib/demo/referenceContentPublisher/sessionStore";
import { getPublicAppOriginFromRequest } from "@/lib/app/publicAppOrigin";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  let body: { search?: string; publish_attempt_id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const search = body.search?.trim() ?? "";
  if (!search) {
    return NextResponse.json({ error: "search_required" }, { status: 400 });
  }

  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const result = await verifyReferencePublisherCallback({
    searchParams: params,
    origin: getPublicAppOriginFromRequest(request),
  });

  const publishAttemptId = params.get("publish_attempt_id") ?? body.publish_attempt_id ?? "";
  const draft = publishAttemptId ? loadReferencePublisherDraft(publishAttemptId) : null;

  return NextResponse.json({
    ...result,
    draft: draft
      ? {
        publish_attempt_id: draft.publish_attempt_id,
        title: draft.title,
        state: draft.state,
        provenance: draft.provenance ?? null,
      }
      : null,
  }, { status: result.ok ? 200 : 422 });
}
