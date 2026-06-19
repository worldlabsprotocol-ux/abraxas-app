// FILE: app/api/contact/submit/route.ts
// Generic contact intake. Used by the disaster/relief fund auditing
// card and the investor inquiry section on the deal pipeline. Routes
// to email via Resend if configured, always records to Supabase so
// nothing is lost even if email delivery has a hiccup.
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      name?: string; email?: string; organization?: string;
      message?: string; category?: string;
    };
    if (!body.name || !body.email || !body.message) {
      return NextResponse.json({ error: "name, email, and message required" }, { status: 400 });
    }

    await supabase.from("contact_submissions").insert({
      name: body.name,
      email: body.email,
      organization: body.organization ?? null,
      message: body.message,
      category: body.category ?? "general",
    });

    // Optional: send a real email via Resend if configured.
    // Skipped silently if RESEND_API_KEY isn't set, the Supabase row
    // above is the source of truth either way.
    if (process.env.RESEND_API_KEY) {
      try {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "Abraxas <notifications@abraxas-app.vercel.app>",
            to: process.env.CONTACT_NOTIFY_EMAIL ?? "founder@abraxas-app.vercel.app",
            subject: `New ${body.category ?? "general"} inquiry from ${body.name}`,
            text: `${body.message}\n\nFrom: ${body.name} (${body.email})\nOrganization: ${body.organization ?? "n/a"}`,
          }),
        });
      } catch { /* email is best-effort, the Supabase row already saved */ }
    }

    return NextResponse.json({ submitted: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
