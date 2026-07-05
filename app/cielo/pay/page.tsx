"use client";
// FILE: app/cielo/pay/page.tsx

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { SuiAuthProvider, useSuiAuth } from "@/components/sui/SuiAuthProvider";
import { CieloPaymentPanel } from "@/components/cielo/CieloPaymentPanel";
import { RedesignNav } from "@/components/redesign/RedesignNav";
import { AmbientGlow } from "@/components/redesign/AmbientGlow";

const FONT = "'Inter',system-ui,sans-serif";

function PayInner() {
  const params = useSearchParams();
  const bookingId = params.get("booking_id") ?? params.get("id") ?? "";
  const { suiAddress } = useSuiAuth();

  if (!bookingId) {
    return (
      <p style={{ fontFamily: FONT, color: "var(--text-muted)" }}>
        Missing booking_id. Use the link from your booking confirmation.
      </p>
    );
  }

  return (
    <div style={{ maxWidth: 520, margin: "0 auto", padding: "2rem 1rem" }}>
      <h1 style={{ fontFamily: FONT, fontSize: "1.35rem", fontWeight: 800, marginBottom: "0.35rem" }}>
        Complete your Cielo payment
      </h1>
      <p style={{ fontFamily: FONT, fontSize: "0.82rem", color: "var(--text-secondary)", marginBottom: "1.25rem" }}>
        Booking {bookingId} · Pay with Apple Pay / card or USDC on Sui · verified on-chain
        {" · "}
        <Link href={`/cielo/status?booking_id=${encodeURIComponent(bookingId)}`} style={{ color: "#10B981" }}>
          Track status
        </Link>
      </p>
      <CieloPaymentPanel bookingId={bookingId} suiAddress={suiAddress} />
    </div>
  );
}

export default function CieloPayPage() {
  return (
    <SuiAuthProvider>
      <div data-theme="dark" style={{ background: "var(--bg)", minHeight: "100vh", color: "var(--text-primary)" }}>
        <AmbientGlow />
        <RedesignNav />
        <Suspense fallback={null}>
          <PayInner />
        </Suspense>
      </div>
    </SuiAuthProvider>
  );
}
