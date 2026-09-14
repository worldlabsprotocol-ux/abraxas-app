"use client";
// FILE: app/cielo/receipt/page.tsx

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { AbxPageHeader } from "@/components/design/AbxPrimitives";
import { RedesignPageLoading } from "@/components/redesign/RedesignPageLoading";
import { CieloReceiptPanel } from "@/components/cielo/CieloReceiptPanel";

const FONT = "'Inter',system-ui,sans-serif";

function ReceiptInner() {
  const params = useSearchParams();
  const bookingId = params.get("booking_id") ?? params.get("id") ?? "";

  if (!bookingId) {
    return (
      <p style={{ fontFamily: FONT, color: "var(--text-muted)" }}>
        Missing booking_id. Use the link from your payment confirmation.
      </p>
    );
  }

  return (
    <>
      <Link href="/flagship" style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-muted)", textDecoration: "none" }}>
        Back to Cielo Sunrise
      </Link>
      <AbxPageHeader accent="home" title="Payment receipt" />
      <CieloReceiptPanel bookingId={bookingId} />
    </>
  );
}

export default function CieloReceiptPage() {
  return (
    <Suspense fallback={<RedesignPageLoading label="Loading receipt…" compact />}>
      <ReceiptInner />
    </Suspense>
  );
}
