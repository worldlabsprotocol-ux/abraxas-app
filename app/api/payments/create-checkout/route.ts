// FILE: app/api/payments/create-checkout/route.ts
// Stripe Checkout Session — handles Wyoming LLC, verification fees, bookings.
// Supports: cards, Apple Pay, Google Pay, Klarna, Afterpay, ACH, Link.
// All enabled in one Payment Element — no per-method code needed.
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
});

// Product definitions — match your Abraxas pricing
const PRODUCTS: Record<string, { name: string; amount: number; description: string }> = {
  wyoming_starter:    { name: "Wyoming LLC — Starter",    amount: 149900, description: "Wyoming LLC formation · Operating Agreement · On-chain Token · V5 Verification" },
  wyoming_growth:     { name: "Wyoming LLC — Growth",     amount: 299900, description: "Everything in Starter + Multi-sig Governance · Cap Table · Lending Eligible" },
  wyoming_enterprise: { name: "Wyoming LLC — Enterprise", amount: 499900, description: "Everything in Growth + Compliance Package · Priority 24h · Dedicated Verifier" },
  asset_verification: { name: "Asset Verification — V5",  amount: 50000,  description: "10-stage V5 pipeline · W3C credential · Collateral score assignment" },
  music_audit:        { name: "Music Royalty Audit",       amount: 29900,  description: "ISRC/ISWC gap analysis · MLC registration check · Royalty gap report" },
  cielo_booking:      { name: "Cielo Sunrise — Stay",      amount: 0,      description: "Nightly rate set dynamically" },
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      product: string;
      email?: string;
      metadata?: Record<string, string>;
      custom_amount?: number; // for dynamic pricing (bookings)
    };

    const product = PRODUCTS[body.product];
    if (!product) {
      return NextResponse.json({ error: "Unknown product" }, { status: 400 });
    }

    const amount = body.custom_amount ?? product.amount;
    if (amount <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    const origin = req.headers.get("origin") ?? process.env.NEXT_PUBLIC_APP_URL ?? "https://abraxas-app.vercel.app";

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      // Payment Method Types — covers all the platforms requested:
      // card = debit + credit (Visa, MC, Amex, Discover)
      // apple_pay + google_pay are automatic when card is enabled
      // klarna, afterpay_clearpay = BNPL
      // us_bank_account = ACH for large B2B transactions
      // link = Stripe Link (1-click checkout for returning users)
      payment_method_types: [
        "card",
        "klarna",
        "afterpay_clearpay",
        "us_bank_account",
        "link",
      ],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: product.name,
              description: product.description,
              images: ["https://abraxas-app.vercel.app/icon-192.png"],
              metadata: { protocol: "abraxas", product: body.product },
            },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ],
      // Pre-fill email if wallet already identified user
      customer_email: body.email,
      // Metadata flows through to webhook — used to trigger LLC formation
      metadata: {
        product:    body.product,
        protocol:   "abraxas",
        ...body.metadata,
      },
      // Redirect after payment
      success_url: `${origin}/payment/success?session_id={CHECKOUT_SESSION_ID}&product=${body.product}`,
      cancel_url:  `${origin}/terminal`,
      // Collect billing address for compliance
      billing_address_collection: "required",
      // Custom branding shown in Stripe-hosted checkout
      custom_text: {
        submit: { message: "Your submission goes to the Abraxas verification team immediately after payment." },
      },
      // Allow promo codes (you can create them in Stripe dashboard)
      allow_promotion_codes: true,
    });

    return NextResponse.json({ url: session.url, session_id: session.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[stripe checkout]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
