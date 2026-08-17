"use client";
// FILE: app/cielo/receipt/page.tsx

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { RedesignNav } from "@/components/redesign/RedesignNav";
import { RedesignPageLoading } from "@/components/redesign/RedesignPageLoading";
import { AmbientGlow } from "@/components/redesign/AmbientGlow";
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
    <div style={{ maxWidth: 560, margin: "0 auto", padding: "2rem 1rem" }}>
      <Link href="/flagship" style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-muted)" }}>
        ← Cielo Sunrise
      </Link>
      <h1 style={{ fontFamily: FONT, fontSize: "1.35rem", fontWeight: 800, margin: "0.75rem 0 1.25rem" }}>
        Payment receipt
      </h1>
      <CieloReceiptPanel bookingId={bookingId} />
    </div>
  );
}

export default function CieloReceiptPage() {
  return (
    <div data-theme="dark" style={{ background: "var(--bg)", minHeight: "100vh", color: "var(--text-primary)" }}>
      <AmbientGlow />
      <RedesignNav />
      <Suspense fallback={<RedesignPageLoading label="Loading receipt…" compact />}>
        <ReceiptInner />
      </Suspense>
    </div>
  );
}
