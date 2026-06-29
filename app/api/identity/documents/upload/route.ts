// FILE: app/api/identity/documents/upload/route.ts
// Receives a document for a non-Identity Passport stamp (Business KYB,
// Business, Property, Asset Owner), stores it in a private Supabase
// Storage bucket, and records it for manual review. These three stamps
// genuinely require a human to look at the document, that part isn't
// being faked as automated.
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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

    if (!file || !email || !stampId) {
      return NextResponse.json({ error: "file, email, and stampId required" }, { status: 400 });
    }

    const path = `${stampId}/${email.replace(/[^a-zA-Z0-9]/g, "_")}/${Date.now()}_${file.name}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await supabase.storage
      .from("passport-documents")
      .upload(path, buffer, { contentType: file.type });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    await supabase.from("passport_documents").insert({
      user_email: email,
      stamp_id: stampId,
      file_name: file.name,
      storage_path: path,
      status: "submitted",
    });

    return NextResponse.json({ uploaded: true, fileName: file.name });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
