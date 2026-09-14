"use client";
// FILE: app/cielo/status/page.tsx

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { AbxPageHeader } from "@/components/design/AbxPrimitives";
import { RedesignPageLoading } from "@/components/redesign/RedesignPageLoading";
import { CieloBookingStatusPanel } from "@/components/cielo/CieloBookingStatusPanel";

const FONT = "'Inter',system-ui,sans-serif";

function StatusInner() {
  const params = useSearchParams();
  const bookingId = params.get("booking_id") ?? params.get("id") ?? "";

  return (
    <>
      <Link href="/flagship" style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-muted)", textDecoration: "none" }}>
        Back to Cielo Sunrise
      </Link>
      <AbxPageHeader
        accent="home"
        title="Track your booking"
        lead="Abraxas Protocol Calendar on Sui"
      />
      <CieloBookingStatusPanel initialBookingId={bookingId || undefined} />
    </>
  );
}

export default function CieloStatusPage() {
  return (
    <Suspense fallback={<RedesignPageLoading label="Loading booking status…" compact />}>
      <StatusInner />
    </Suspense>
  );
}
