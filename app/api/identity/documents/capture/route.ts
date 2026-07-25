// FILE: app/api/identity/documents/capture/route.ts
// Abraxas-native identity capture: legal name + ID front + selfie in one submission.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { normalizeSuiAddress } from "@mysten/sui/utils";
import { randomUUID } from "crypto";
import { transitionIdentityVerification } from "@/lib/idv/identityVerificationDb";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const ALLOWED_TYPES = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);
const MAX_BYTES = 8 * 1024 * 1024;

async function uploadCaptureFile(
  file: File,
  email: string,
  sessionId: string,
  documentType: "id_front" | "selfie",
) {
  if (!ALLOWED_TYPES.has(file.type)) {
    throw new Error(`Invalid file type for ${documentType}. Use JPG or PNG.`);
  }
  if (file.size > MAX_BYTES) {
    throw new Error(`File too large for ${documentType}. Max 8 MB.`);
  }

  const emailSafe = email.replace(/[^a-zA-Z0-9]/g, "_");
  const ext = file.type.includes("png") ? "png" : "jpg";
  const path = `identity/${emailSafe}/${sessionId}/${documentType}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from("passport-documents")
    .upload(path, buffer, { contentType: file.type || "image/jpeg", upsert: false });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  return { path, fileName: `${documentType}.${ext}` };
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const email = (formData.get("email") as string | null)?.trim();
    const legalName = (formData.get("legal_name") as string | null)?.trim();
    const suiRaw = (formData.get("sui_address") as string | null)?.trim();
    const idFront = formData.get("id_front") as File | null;
    const selfie = formData.get("selfie") as File | null;

    if (!email || !legalName || !suiRaw || !idFront || !selfie) {
      return NextResponse.json({
        error: "email, legal_name, sui_address, id_front, and selfie are required",
      }, { status: 400 });
    }

    if (legalName.length < 2) {
      return NextResponse.json({ error: "legal_name must be at least 2 characters" }, { status: 400 });
    }

    let suiAddress: string;
    try {
      suiAddress = normalizeSuiAddress(suiRaw);
    } catch {
      return NextResponse.json({ error: "Invalid sui_address" }, { status: 400 });
    }

    const captureSessionId = randomUUID();

    const [idUpload, selfieUpload] = await Promise.all([
      uploadCaptureFile(idFront, email, captureSessionId, "id_front"),
      uploadCaptureFile(selfie, email, captureSessionId, "selfie"),
    ]);

    const rows = [
      {
        user_email: email,
        sui_address: suiAddress,
        stamp_id: "identity",
        file_name: idUpload.fileName,
        storage_path: idUpload.path,
        status: "submitted",
        document_type: "id_front",
        capture_session_id: captureSessionId,
        legal_name: legalName,
      },
      {
        user_email: email,
        sui_address: suiAddress,
        stamp_id: "identity",
        file_name: selfieUpload.fileName,
        storage_path: selfieUpload.path,
        status: "submitted",
        document_type: "selfie",
        capture_session_id: captureSessionId,
        legal_name: legalName,
      },
    ];

    const { data: inserted, error: insertErr } = await supabase
      .from("passport_documents")
      .insert(rows)
      .select("id, document_type");

    if (insertErr) {
      return NextResponse.json({ error: insertErr.message }, { status: 500 });
    }

    await transitionIdentityVerification(
      suiAddress,
      {
        user_email: email,
        status: "pending",
        identity_verification_status: "submitted",
        credential_status: "not_issued",
        liveness_provider: "abraxas_capture",
        document_type: "passport",
        error_message: null,
      },
      "abraxas_identity_capture",
    );

    return NextResponse.json({
      submitted: true,
      capture_session_id: captureSessionId,
      document_ids: inserted?.map(r => r.id) ?? [],
      review_status: "submitted",
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
