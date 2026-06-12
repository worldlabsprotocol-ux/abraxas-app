// FILE: app/api/payments/webhook/route.ts
// Stripe webhook — fires after successful payment.
// Triggers LLC formation, sends confirmation emails, updates Supabase.
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig  = req.headers.get("stripe-signature");

  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Webhook signature failed";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const product  = session.metadata?.["product"] ?? "unknown";
    const email    = session.customer_email ?? session.metadata?.["email"] ?? "";
    const amountPaid = (session.amount_total ?? 0) / 100;
    const paymentIntentId = typeof session.payment_intent === "string"
      ? session.payment_intent : session.payment_intent?.id ?? "";

    // 1. Record payment in Supabase
    await supabase.from("payments").insert({
      stripe_session_id:   session.id,
      stripe_payment_intent: paymentIntentId,
      product,
      amount_usd:          amountPaid,
      customer_email:      email,
      metadata:            session.metadata,
      status:              "paid",
      created_at:          new Date().toISOString(),
    }).select();

    // 2. Product-specific post-payment actions
    if (product.startsWith("wyoming_")) {
      const tier = product.replace("wyoming_", "") as "starter"|"growth"|"enterprise";
      // Update tokenization_requests to mark as paid
      await supabase
        .from("tokenization_requests")
        .update({ payment_status: "paid", stripe_session_id: session.id })
        .eq("contact_email", email)
        .order("created_at", { ascending: false })
        .limit(1);

      // Send confirmation email via Resend (non-blocking)
      const RESEND_API_KEY = process.env.RESEND_API_KEY;
      if (RESEND_API_KEY && email) {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: "Abraxas Protocol <payments@abraxas-app.vercel.app>",
            to: email,
            subject: `Payment confirmed — Wyoming LLC ${tier.charAt(0).toUpperCase() + tier.slice(1)}`,
            html: `<p>Your payment of <strong>$${amountPaid.toLocaleString()}</strong> has been received.</p>
                   <p>Your Wyoming LLC formation is now in queue. You'll receive updates within 24–48 hours.</p>
                   <p>Stripe receipt: ${paymentIntentId}</p>
                   <p>— Abraxas Protocol</p>`,
          }),
        }).catch(() => null);
      }
    }

    if (product === "asset_verification") {
      await supabase
        .from("submitted_assets")
        .update({ payment_status: "paid", stripe_session_id: session.id })
        .eq("contact_email", email)
        .order("created_at", { ascending: false })
        .limit(1);
    }
  }

  return NextResponse.json({ received: true });
}
