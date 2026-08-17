"use client";
// FILE: app/cielo/status/page.tsx

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { RedesignNav } from "@/components/redesign/RedesignNav";
import { RedesignPageLoading } from "@/components/redesign/RedesignPageLoading";
import { AmbientGlow } from "@/components/redesign/AmbientGlow";
import { CieloBookingStatusPanel } from "@/components/cielo/CieloBookingStatusPanel";

const FONT = "'Inter',system-ui,sans-serif";

function StatusInner() {
  const params = useSearchParams();
  const bookingId = params.get("booking_id") ?? params.get("id") ?? "";

  return (
    <div style={{ maxWidth: 520, margin: "0 auto", padding: "2rem 1rem" }}>
      <Link href="/flagship" style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-muted)" }}>
        ← Cielo Sunrise
      </Link>
      <h1 style={{ fontFamily: FONT, fontSize: "1.35rem", fontWeight: 800, margin: "0.75rem 0 0.35rem" }}>
        Track your booking
      </h1>
      <p style={{ fontFamily: FONT, fontSize: "0.82rem", color: "var(--text-secondary)", marginBottom: "1.25rem" }}>
        Abraxas Protocol Calendar · USDC on Sui
      </p>
      <CieloBookingStatusPanel initialBookingId={bookingId || undefined} />
    </div>
  );
}

export default function CieloStatusPage() {
  return (
    <div data-theme="dark" style={{ background: "var(--bg)", minHeight: "100vh", color: "var(--text-primary)" }}>
      <AmbientGlow />
      <RedesignNav />
      <Suspense fallback={<RedesignPageLoading label="Loading booking status…" compact />}>
        <StatusInner />
      </Suspense>
    </div>
  );
}
