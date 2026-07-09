// FILE: app/api/identity/documents/upload/route.ts
// Stores passport documents in private Supabase Storage for manual review.
// Identity stamp uploads are the Veriff workaround when live IDV is disabled.
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { normalizeSuiAddress } from "@mysten/sui/utils";
import { transitionIdentityVerification } from "@/lib/idv/identityVerificationDb";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const email = formData.get("email") as string | null;
    const stampId = formData.get("stampId") as string | null;
    const suiRaw = formData.get("sui_address") as string | null;

    if (!file || !email || !stampId) {
      return NextResponse.json({ error: "file, email, and stampId required" }, { status: 400 });
    }

    let suiAddress: string | null = null;
    if (suiRaw?.trim()) {
      try {
        suiAddress = normalizeSuiAddress(suiRaw.trim());
      } catch {
        return NextResponse.json({ error: "Invalid sui_address" }, { status: 400 });
      }
    }

    const path = `${stampId}/${email.replace(/[^a-zA-Z0-9]/g, "_")}/${Date.now()}_${file.name}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await supabase.storage
      .from("passport-documents")
      .upload(path, buffer, { contentType: file.type });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const { data: inserted, error: insertErr } = await supabase.from("passport_documents").insert({
      user_email: email,
      sui_address: suiAddress,
      stamp_id: stampId,
      file_name: file.name,
      storage_path: path,
      status: "submitted",
    }).select("id").single();

    if (insertErr) {
      return NextResponse.json({ error: insertErr.message }, { status: 500 });
    }

    if (stampId === "identity" && suiAddress) {
      await transitionIdentityVerification(
        suiAddress,
        {
          user_email: email,
          status: "pending",
          identity_verification_status: "submitted",
          credential_status: "not_issued",
          liveness_provider: "manual_review",
          error_message: null,
        },
        "document_upload",
      );
    }

    return NextResponse.json({
      uploaded: true,
      fileName: file.name,
      document_id: inserted?.id,
      review_status: stampId === "identity" ? "submitted" : undefined,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
