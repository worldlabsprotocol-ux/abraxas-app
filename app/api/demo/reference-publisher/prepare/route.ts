import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { fingerprintArticleDraft } from "@/lib/demo/referenceContentPublisher/articleFingerprint";
import {
  REFERENCE_PUBLISHER_PREPARE_API,
} from "@/lib/demo/referenceContentPublisher/contract";
import {
  buildReferencePublisherVerifyUrl,
  resolveReferencePublisherConfig,
} from "@/lib/demo/referenceContentPublisher/config";
import { saveReferencePublisherDraft } from "@/lib/demo/referenceContentPublisher/sessionStore";
import { getPublicAppOriginFromRequest } from "@/lib/app/publicAppOrigin";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  let body: { title?: string; body?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const title = body.title?.trim() ?? "";
  const articleBody = body.body?.trim() ?? "";
  if (!title || !articleBody) {
    return NextResponse.json({ error: "title_and_body_required" }, { status: 400 });
  }

  const config = resolveReferencePublisherConfig(getPublicAppOriginFromRequest(request));
  if (!config.configured) {
    return NextResponse.json({ error: "publisher_not_configured" }, { status: 503 });
  }

  const fingerprint = fingerprintArticleDraft({ title, body: articleBody });
  const publishAttemptId = `pub_${randomBytes(12).toString("hex")}`;

  saveReferencePublisherDraft({
    publish_attempt_id: publishAttemptId,
    title,
    body: articleBody,
    content_hash: fingerprint.content_hash,
    byte_length: fingerprint.byte_length,
    created_at: new Date().toISOString(),
    state: "awaiting_proof",
  });

  const verifyUrl = buildReferencePublisherVerifyUrl({
    origin: getPublicAppOriginFromRequest(request),
    publishAttemptId,
    expectedContentHash: fingerprint.content_hash,
  });

  return NextResponse.json({
    publish_attempt_id: publishAttemptId,
    content_hash: fingerprint.content_hash,
    verify_url: verifyUrl,
    callback_url: config.callback_url,
    api: REFERENCE_PUBLISHER_PREPARE_API,
    publisher: config.display_name,
    policy_pack: config.pack_id,
  });
}
