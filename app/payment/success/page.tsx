// FILE: app/payment/success/page.tsx
// Post-checkout return page. conditional next steps — no server-side payment verification on this route.

"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  PAYMENT_RETURN_DEFAULT_STEPS,
  PAYMENT_RETURN_EYEBROW,
  PAYMENT_RETURN_HEADLINE,
  PAYMENT_RETURN_LEAD,
  PAYMENT_RETURN_PRIMARY_CTA,
  PAYMENT_RETURN_SECONDARY_CTA,
  PAYMENT_RETURN_SECONDARY_HREF,
  PAYMENT_RETURN_UNKNOWN_PRODUCT_LABEL,
} from "@/lib/integrate/partnerJourney";

const M = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const S = "system-ui,-apple-system,sans-serif";
const G = "#10B981";
const W = "#F8FAFC";
const BDR = "#1C2333";

const PRODUCT_LABELS: Record<string, string> = {
  wyoming_starter: "Wyoming LLC · Starter",
  wyoming_growth: "Wyoming LLC · Growth",
  wyoming_enterprise: "Wyoming LLC · Enterprise",
  asset_verification: "Asset verification intake",
  music_audit: "Music royalty audit intake",
};

const PRODUCT_STEPS: Record<string, readonly string[]> = {
  wyoming_starter: [
    "If your payment completed, check your email for Wyoming LLC intake instructions.",
    "Entity filing and any tokenization steps are manual in this beta — nothing starts automatically.",
    "Open Passport to bind your wallet for verification workflows when needed.",
    "Follow email instructions for document review updates.",
  ],
  wyoming_growth: [
    "If your payment completed, check your email for growth-tier intake instructions.",
    "Governance and cap-table steps are coordinated manually in this beta.",
    "Open Passport to bind your wallet for verification workflows when needed.",
    "Follow email instructions for next steps.",
  ],
  wyoming_enterprise: [
    "If your payment completed, check your email for enterprise intake instructions.",
    "Priority handling is not guaranteed in this public beta.",
    "Open Passport to bind your wallet for verification workflows when needed.",
    "Follow email instructions for next steps.",
  ],
  asset_verification: [
    "If your payment completed, check your email for asset verification intake instructions.",
    "Document review is manual in this beta — timelines vary.",
    "Open Passport to bind your wallet and use verification tools when required.",
    "Credential issuance depends on review outcome.",
  ],
  music_audit: [
    "If your payment completed, check your email for music audit intake instructions.",
    "Catalog review is manual in this beta — timelines vary.",
    "Open Passport to bind your wallet for verification workflows when needed.",
    "Follow email instructions for report delivery.",
  ],
};

function resolveProduct(productParam: string | null) {
  const key = productParam?.trim() ?? "";
  const known = key && key in PRODUCT_LABELS;
  return {
    label: known ? PRODUCT_LABELS[key]! : PAYMENT_RETURN_UNKNOWN_PRODUCT_LABEL,
    steps: known ? PRODUCT_STEPS[key]! : PAYMENT_RETURN_DEFAULT_STEPS,
  };
}

export default function PaymentSuccessPage() {
  const params = useSearchParams();
  const product = params.get("product");
  const { label, steps } = resolveProduct(product);

  return (
    <div style={{
      background: "#060810", minHeight: "100vh", fontFamily: M,
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "2rem 1rem",
    }}>
      <div style={{ maxWidth: 540, width: "100%" }}>
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div style={{
            fontFamily: M, fontSize: "0.58rem", fontWeight: 700,
            color: G, letterSpacing: "0.15em", textTransform: "uppercase",
            marginBottom: "0.75rem",
          }}>
            {PAYMENT_RETURN_EYEBROW}
          </div>
          <h1 style={{
            fontFamily: "Georgia,serif",
            fontSize: "clamp(1.5rem,4vw,2rem)",
            fontWeight: 700, color: W, marginBottom: "0.5rem",
          }}>
            {PAYMENT_RETURN_HEADLINE}
          </h1>
          <p style={{
            fontFamily: S, fontSize: "0.85rem",
            color: "rgba(255,255,255,0.55)", lineHeight: 1.65,
            margin: "0 0 0.5rem", maxWidth: 420, marginInline: "auto",
          }}>
            {PAYMENT_RETURN_LEAD}
          </p>
          <div style={{ fontFamily: S, fontSize: "0.78rem", color: "rgba(255,255,255,0.4)" }}>
            {label}
          </div>
        </div>

        <div style={{
          background: "#0D1117", border: `1px solid ${BDR}`,
          borderRadius: 8, padding: "1.25rem", marginBottom: "1.25rem",
        }}>
          <div style={{
            fontFamily: M, fontSize: "0.58rem", fontWeight: 700,
            color: G, letterSpacing: "0.15em", textTransform: "uppercase",
            marginBottom: "0.875rem",
          }}>
            What to do next
          </div>
          <ol style={{
            margin: 0, paddingLeft: "1.125rem",
            display: "flex", flexDirection: "column", gap: "0.625rem",
          }}>
            {steps.map((step) => (
              <li key={step} style={{
                fontFamily: S, fontSize: "0.78rem",
                color: "rgba(255,255,255,0.55)", lineHeight: 1.6,
              }}>
                {step}
              </li>
            ))}
          </ol>
        </div>

        <div style={{ display: "flex", gap: "0.625rem", flexWrap: "wrap" }}>
          <Link href="/passport" style={{
            flex: 1, display: "block", padding: "0.75rem", borderRadius: 5,
            border: "none", background: G, color: "#000", fontFamily: M,
            fontSize: "0.78rem", fontWeight: 900, textDecoration: "none",
            textAlign: "center", letterSpacing: "0.05em", textTransform: "uppercase",
            minWidth: 140,
          }}>
            {PAYMENT_RETURN_PRIMARY_CTA}
          </Link>
          <Link href={PAYMENT_RETURN_SECONDARY_HREF} style={{
            flex: 1, display: "block", padding: "0.75rem", borderRadius: 5,
            border: `1px solid ${BDR}`, background: "transparent",
            color: "rgba(255,255,255,0.4)", fontFamily: M, fontSize: "0.75rem",
            fontWeight: 700, textDecoration: "none", textAlign: "center",
            letterSpacing: "0.06em", textTransform: "uppercase", minWidth: 140,
          }}>
            {PAYMENT_RETURN_SECONDARY_CTA}
          </Link>
        </div>
      </div>
    </div>
  );
}
