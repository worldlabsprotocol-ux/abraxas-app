// FILE: app/api/integrations/apply/route.ts
// Design partner application — validated intake, best-effort dedup, safe logging.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { issueAuthenticationProof } from "@/lib/authenticationProof/issue";
import { adminEmailShell, adminEmailTable, sendAdminEmail } from "@/lib/notify/adminResend";
import {
  findRecentDuplicateDesignPartnerApplication,
  parseDesignPartnerApplicationFields,
  readBoundedJsonBody,
  validateDesignPartnerApplicationEnvelope,
} from "@/lib/integrations/designPartnerApplicationIntake";
import {
  checkDesignPartnerApplyRateLimit,
  designPartnerApplyRateLimitResponse,
  designPartnerApplyRateLimitUnavailableResponse,
} from "@/lib/integrations/designPartnerApplicationRateLimit";
import { logSafeOperationalError } from "@/lib/partner/webhooks/webhookDispatchError";

function getSupabaseConfig(): { url: string; key: string } {
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    key: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  };
}

function invalidRequestResponse(): NextResponse {
  return NextResponse.json({ error: "Invalid request" }, { status: 400 });
}

function successResponse(): NextResponse {
  return NextResponse.json({ ok: true });
}

export async function POST(req: NextRequest) {
  const bounded = await readBoundedJsonBody(req);
  if (!bounded.ok) {
    return invalidRequestResponse();
  }

  let body: unknown;
  try {
    body = JSON.parse(bounded.text);
  } catch {
    return invalidRequestResponse();
  }

  const envelope = validateDesignPartnerApplicationEnvelope(body);
  if (!envelope.ok) {
    return invalidRequestResponse();
  }
  if (envelope.action === "honeypot") {
    return successResponse();
  }

  const parsed = parseDesignPartnerApplicationFields(body);
  if (!parsed.ok) {
    return invalidRequestResponse();
  }

  const rateLimit = await checkDesignPartnerApplyRateLimit(req);
  if (
    rateLimit.backend === "identity_unavailable"
    || rateLimit.backend === "distributed_config_incomplete"
    || rateLimit.backend === "distributed_unavailable"
  ) {
    return designPartnerApplyRateLimitUnavailableResponse();
  }
  if (!rateLimit.allowed) {
    return designPartnerApplyRateLimitResponse(rateLimit);
  }

  const { url: sbUrl, key: sbKey } = getSupabaseConfig();
  if (!sbUrl || !sbKey) {
    return NextResponse.json({ error: "Service temporarily unavailable" }, { status: 503 });
  }

  const sb = createClient(sbUrl, sbKey, { auth: { persistSession: false } });

  const duplicate = await findRecentDuplicateDesignPartnerApplication(sb, {
    emailDedupNorm: parsed.emailDedupNorm,
    companyDedupNorm: parsed.companyDedupNorm,
  });
  if (duplicate.duplicate) {
    return successResponse();
  }

  const row = parsed.row;
  const { data, error } = await sb.from("design_partners").insert(row).select("id").single();

  if (error || !data?.id) {
    logSafeOperationalError("integrations.apply.insert", error ?? new Error("insert_missing_id"));
    return NextResponse.json({ error: "Could not save application" }, { status: 500 });
  }

  const recordId = data.id as string;
  let proofIdLabel = "unavailable";

  try {
    const proof = await issueAuthenticationProof({
      eventType: "design_partner_apply",
      recordId,
      recordPayload: { ...row, record_id: recordId },
    });
    if (proof.proof_id) {
      proofIdLabel = proof.proof_id;
    }
  } catch (err) {
    logSafeOperationalError("integrations.apply.proof", err);
  }

  try {
    await sendAdminEmail({
      subject: `Design partner apply — ${row.company}`,
      html: adminEmailShell(
        "New integration application",
        adminEmailTable({
          Company: row.company,
          Contact: row.contact_name ?? "—",
          Email: row.email,
          Website: row.website ?? "—",
          "Use case": row.use_case ?? "—",
          Volume: row.monthly_volume ?? "—",
          Type: row.integration_type,
          "Proof ID": proofIdLabel,
        }),
      ),
    });
  } catch (err) {
    logSafeOperationalError("integrations.apply.notify", err);
  }

  return successResponse();
}
