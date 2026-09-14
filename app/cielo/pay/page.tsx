"use client";
// FILE: app/cielo/pay/page.tsx

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useSuiAuth } from "@/components/sui/SuiAuthProvider";
import { CieloPaymentPanel } from "@/components/cielo/CieloPaymentPanel";
import { AbxPageHeader } from "@/components/design/AbxPrimitives";
import { RedesignPageLoading } from "@/components/redesign/RedesignPageLoading";

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
    <>
      <AbxPageHeader
        accent="home"
        eyebrow="Cielo payment"
        title="Complete your Cielo payment"
        lead={`Booking ${bookingId}. Pay with Apple Pay or card.`}
      />
      <p style={{ fontFamily: FONT, fontSize: "0.82rem", color: "var(--text-secondary)", marginBottom: "1.25rem" }}>
        <Link href={`/cielo/status?booking_id=${encodeURIComponent(bookingId)}`} style={{ color: "var(--abx-accent)", fontWeight: 600, textDecoration: "none" }}>
          Track status
        </Link>
      </p>
      <CieloPaymentPanel bookingId={bookingId} suiAddress={suiAddress} />
    </>
  );
}

export default function CieloPayPage() {
  return (
    <Suspense fallback={<RedesignPageLoading label="Loading payment…" compact />}>
      <PayInner />
    </Suspense>
  );
}
